import { createAdminClient } from './admin';

/** Private bucket for WIOA eligibility documents (SSN cards, ID, EDD letters) — separate from
 * Evidence, which stays filename-only (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions" — Evidence
 * Storage question). Server-only: uploads and signed-URL generation both go through the
 * service-role client since there is no learner-facing Supabase session with Storage RLS set up
 * for this bucket in the prototype — access control is enforced in the server actions
 * (src/lib/actions/wioa.ts) that call these helpers, not by Storage policies. */
const WIOA_DOCUMENTS_BUCKET = 'wioa-documents';

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
  await ensureBucket();
  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
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
