import sharp from 'sharp';
import { createAdminClient } from './admin';

/** Private bucket for Practical Evidence attachments (photos, PDFs, short clips of trade work).
 * Server-only, same trade-off as `wioa-storage.ts`: there is no learner-facing Supabase session
 * with Storage RLS set up for this bucket, so access control is enforced in the server actions
 * (src/lib/actions/progress.ts) that call these helpers, not by Storage policies. */
const EVIDENCE_BUCKET = 'evidence-files';

const MAX_IMAGE_OR_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

/** Allowed types, keyed by declared MIME type — each checked against the file's real magic bytes
 * so a renamed/relabeled file can't slip past the client's <input accept> filter. */
const EVIDENCE_SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  'application/pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  // MP4/MOV both use the ISO base media container — the signature lives at byte offset 4, not 0.
  'video/mp4': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
  'video/quicktime': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
};

const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);

export class InvalidEvidenceFileError extends Error {}

function assertValidEvidenceFile(file: File, buffer: Buffer): void {
  const maxBytes = VIDEO_TYPES.has(file.type) ? MAX_VIDEO_BYTES : MAX_IMAGE_OR_DOCUMENT_BYTES;
  if (file.size > maxBytes) {
    throw new InvalidEvidenceFileError(`File is too large (max ${maxBytes / (1024 * 1024)}MB).`);
  }
  const matchesSignature = EVIDENCE_SIGNATURES[file.type];
  if (!matchesSignature || !matchesSignature(buffer)) {
    throw new InvalidEvidenceFileError(
      'Unsupported file type. Upload a PDF, JPG, PNG, MP4, or MOV.',
    );
  }
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

// Long edge cap + recompression at upload time, not per-request (docs/build/PERFORMANCE_PLAN.md
// §5.2) — a learner's phone photo (often 12MP+) is far larger than any screen it's ever displayed
// on, so every uncapped original is pure storage cost with no quality benefit.
const MAX_IMAGE_DIMENSION_PX = 2000;
const JPEG_QUALITY = 82;
const PNG_COMPRESSION_LEVEL = 9;

/** Resizes to a long-edge cap and recompresses, for images only — video/PDF pass through
 * unchanged (video delivery cost is its own open decision, docs/build/PERFORMANCE_PLAN.md §5.2).
 * `.rotate()` applies EXIF orientation before the metadata (including EXIF) is stripped by
 * re-encoding, so re-oriented images don't end up sideways. */
export async function downscaleImageIfNeeded(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!IMAGE_TYPES.has(mimeType)) return buffer;
  try {
    const image = sharp(buffer).rotate();
    const resized = image.resize(MAX_IMAGE_DIMENSION_PX, MAX_IMAGE_DIMENSION_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    return mimeType === 'image/jpeg'
      ? await resized.jpeg({ quality: JPEG_QUALITY }).toBuffer()
      : await resized.png({ compressionLevel: PNG_COMPRESSION_LEVEL }).toBuffer();
  } catch {
    throw new InvalidEvidenceFileError('Could not process image file.');
  }
}

let bucketEnsured = false;

async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.createBucket(EVIDENCE_BUCKET, { public: false });
  // Ignore "already exists" — this runs lazily on first upload rather than requiring a manual
  // dashboard setup step for the prototype.
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
  bucketEnsured = true;
}

export async function uploadEvidenceFile(path: string, file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  assertValidEvidenceFile(file, buffer);
  const storedBuffer = await downscaleImageIfNeeded(buffer, file.type);

  await ensureBucket();
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, storedBuffer, { contentType: file.type || undefined, upsert: true });
  if (error) throw error;
}

export async function deleteEvidenceFile(path: string): Promise<void> {
  await ensureBucket();
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
  if (error) throw error;
}

/** Short-lived signed URL for the learner or a reviewing Admin — never a public URL, same
 * pattern as `getWioaDocumentSignedUrl`. */
export async function getEvidenceFileSignedUrl(path: string): Promise<string> {
  await ensureBucket();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error || !data) throw error ?? new Error('Failed to sign evidence file URL.');
  return data.signedUrl;
}
