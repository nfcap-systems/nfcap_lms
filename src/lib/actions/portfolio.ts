'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from './guard';
import { logAuditEvent } from './audit';
import { getLearnerIdByPortfolioShareToken } from '@/lib/data/learners';
import { getEvidenceFileSignedUrl } from '@/lib/supabase/evidence-storage';

/** Shareable Verified Portfolio (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — one active share link
 * per learner, matching LRN07's "Share your portfolio" panel, wired to the public
 * `/portfolio/[token]` route (Phase 4). */
export async function generatePortfolioShareToken(): Promise<string> {
  const user = await requireUser();
  const existing = await prisma.learnerProfile.findUnique({
    where: { learnerId: user.id },
    select: { portfolioShareToken: true },
  });
  if (existing?.portfolioShareToken) return existing.portfolioShareToken;

  const token = randomBytes(12).toString('base64url');
  await prisma.learnerProfile.upsert({
    where: { learnerId: user.id },
    update: { portfolioShareToken: token, portfolioSharedAt: new Date() },
    create: { learnerId: user.id, portfolioShareToken: token, portfolioSharedAt: new Date() },
  });
  await logAuditEvent({
    actor: user,
    action: 'SHARE_PORTFOLIO',
    targetType: 'LearnerProfile',
    targetId: user.id,
  });
  revalidatePath('/learner/portfolio');
  return token;
}

export async function revokePortfolioShareToken(): Promise<void> {
  const user = await requireUser();
  await prisma.learnerProfile.update({
    where: { learnerId: user.id },
    data: { portfolioShareToken: null, portfolioSharedAt: null },
  });
  await logAuditEvent({
    actor: user,
    action: 'REVOKE_PORTFOLIO_SHARE',
    targetType: 'LearnerProfile',
    targetId: user.id,
  });
  revalidatePath('/learner/portfolio');
}

/** Resolves a signed URL for an evidence photo shown on the public `/portfolio/[token]` page —
 * no session exists there, so this checks the share token itself instead of `requireUser()`
 * (same trust model as the token granting the page view at all). Returns `null` rather than
 * throwing for any mismatch (unknown/revoked token, or a file that isn't actually this learner's)
 * — minimal-disclosure, same reasoning as `getPublicCredentialBySlug`. */
export async function getPublicPortfolioFileUrl(
  token: string,
  args: { evidenceSubmissionId?: string; criterionAssessmentId?: string },
): Promise<string | null> {
  const learnerId = await getLearnerIdByPortfolioShareToken(token);
  if (!learnerId) return null;

  if (args.criterionAssessmentId) {
    const assessment = await prisma.criterionAssessment.findUnique({
      where: { id: args.criterionAssessmentId },
      select: {
        learnerFilePath: true,
        evidenceSubmission: { select: { enrollment: { select: { learnerId: true } } } },
      },
    });
    if (!assessment || assessment.evidenceSubmission.enrollment.learnerId !== learnerId) {
      return null;
    }
    return assessment.learnerFilePath ? getEvidenceFileSignedUrl(assessment.learnerFilePath) : null;
  }

  if (args.evidenceSubmissionId) {
    const evidence = await prisma.evidenceSubmission.findUnique({
      where: { id: args.evidenceSubmissionId },
      select: { filePath: true, enrollment: { select: { learnerId: true } } },
    });
    if (!evidence || evidence.enrollment.learnerId !== learnerId) return null;
    return evidence.filePath ? getEvidenceFileSignedUrl(evidence.filePath) : null;
  }

  return null;
}
