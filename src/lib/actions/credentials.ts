'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from './guard';
import { logAuditEvent } from './audit';

/** Public Verification Page + QR (docs/build/LAYER1_DATA_MODEL_DESIGN.md). The slug is the only
 * thing a public, no-login verification page needs — generated here, not at certificate-issue
 * time in progress.ts, so every certificate issued before this feature existed stays `null`
 * until its owner opts in (same nullable-backfill pattern as EvidenceSubmission.filePath). No UI
 * wired to these yet (LRN09-PublicVerify is not built, Layer 4). */
export async function generateCertificatePublicSlug(certificateId: string): Promise<string> {
  const user = await requireUser();
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id: certificateId },
    select: { id: true, publicSlug: true, enrollment: { select: { learnerId: true } } },
  });
  if (certificate.enrollment.learnerId !== user.id) {
    throw new Error('You can only share your own certificate.');
  }
  if (certificate.publicSlug) return certificate.publicSlug;

  const slug = randomBytes(12).toString('base64url');
  await prisma.certificate.update({ where: { id: certificateId }, data: { publicSlug: slug } });
  await logAuditEvent({
    actor: user,
    action: 'GENERATE_CERTIFICATE_PUBLIC_SLUG',
    targetType: 'Certificate',
    targetId: certificateId,
  });
  revalidatePath('/learner/certificates');
  return slug;
}

export async function revokeCertificatePublicSlug(certificateId: string): Promise<void> {
  const user = await requireUser();
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id: certificateId },
    select: { enrollment: { select: { learnerId: true } } },
  });
  if (certificate.enrollment.learnerId !== user.id) {
    throw new Error('You can only revoke your own certificate.');
  }
  await prisma.certificate.update({ where: { id: certificateId }, data: { publicSlug: null } });
  await logAuditEvent({
    actor: user,
    action: 'REVOKE_CERTIFICATE_PUBLIC_SLUG',
    targetType: 'Certificate',
    targetId: certificateId,
  });
  revalidatePath('/learner/certificates');
}
