import { createAdminClient } from './admin';

/** Private bucket for WIOA eligibility documents (SSN cards, ID, EDD letters) — separate from
 * Evidence, which stays filename-only (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions" — Evidence
 * Storage question). Server-only: uploads and signed-URL generation both go through the
 * service-role client since there is no learner-facing Supabase session with Storage RLS set up
 * for this bucket in the prototype — access control is enforced in the server actions
 * (src/lib/actions/wioa.ts) that call these helpers, not by Storage policies. */
const WIOA_DOCUMENTS_BUCKET = 'wioa-documents';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB

/** Allowed types, keyed by declared MIME type — each checked against the file's real magic bytes
 * so a renamed/relabeled file can't slip past the client's <input accept> filter. */
const DOCUMENT_SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  'application/pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

export class InvalidDocumentFileError extends Error {}

function assertValidDocumentFile(file: File, buffer: Buffer): void {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new InvalidDocumentFileError(
      `File is too large (max ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB).`
    );
  }
  const matchesSignature = DOCUMENT_SIGNATURES[file.type];
  if (!matchesSignature || !matchesSignature(buffer)) {
    throw new InvalidDocumentFileError('Unsupported file type. Upload a PDF, JPG, or PNG.');
  }
}

let bucketEnsured = false;

async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.createBucket(WIOA_DOCUMENTS_BUCKET, { public: false });
  // Ignore "already exists" — this runs lazily on first upload rather than requiring a manual
  // dashboard setup step for the prototype.
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
  bucketEnsured = true;
}

export async function uploadWioaDocumentFile(path: string, file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  assertValidDocumentFile(file, buffer);

  await ensureBucket();
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(WIOA_DOCUMENTS_BUCKET)
    .upload(path, buffer, { contentType: file.type || undefined, upsert: true });
  if (error) throw error;
}

/** Short-lived signed URL for staff review — never a public URL
 * (WIOA_INTEGRATION_PLAN.md Section 10). */
export async function getWioaDocumentSignedUrl(path: string): Promise<string> {
  await ensureBucket();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(WIOA_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error || !data) throw error ?? new Error('Failed to sign document URL.');
  return data.signedUrl;
}
