'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from './guard';
import { applyEvidenceStatus } from './progress';
import { logAuditEvent } from './audit';

function revalidateReviewViews(learnerId: string, courseSlug: string) {
  revalidatePath(`/admin/learners/${learnerId}/review/${courseSlug}`);
  revalidatePath(`/admin/learners/${learnerId}`);
  revalidatePath('/admin/reviews');
  revalidatePath('/learner');
  revalidatePath(`/learner/courses/${courseSlug}`);
  revalidatePath('/learner/my-learning');
  revalidatePath('/learner/portfolio');
  revalidatePath('/learner/certificates');
}

/** Admin's per-criterion verdict (ADM11-PerCriterionReview's Met/Not met toggle + reviewer note).
 * Upserts rather than appending — this is a reviewer revising a verdict before finalizing the same
 * submission, not a new attempt; a resubmission is a new EvidenceSubmission row (and therefore new
 * CriterionAssessment rows) per CriterionAssessment's own doc comment. */
export async function setCriterionVerdict(
  evidenceSubmissionId: string,
  criterionId: string,
  met: boolean,
  reviewerNote?: string,
): Promise<void> {
  const admin = await requireAdmin();

  // Scopes the write to this submission's own course, so a stale/forged criterionId from a
  // different course can't attach a verdict to evidence it was never assessed against.
  const evidence = await prisma.evidenceSubmission.findUniqueOrThrow({
    where: { id: evidenceSubmissionId },
    include: {
      enrollment: { select: { learnerId: true, course: { select: { slug: true, id: true } } } },
    },
  });
  const criterion = await prisma.assessmentCriterion.findUniqueOrThrow({
    where: { id: criterionId },
    select: { courseId: true },
  });
  if (criterion.courseId !== evidence.enrollment.course.id) {
    throw new Error("This criterion does not belong to this submission's course.");
  }

  await prisma.criterionAssessment.upsert({
    where: { evidenceSubmissionId_criterionId: { evidenceSubmissionId, criterionId } },
    update: { met, reviewerNote, reviewedBy: admin.id, reviewedAt: new Date() },
    create: {
      evidenceSubmissionId,
      criterionId,
      met,
      reviewerNote,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });

  revalidateReviewViews(evidence.enrollment.learnerId, evidence.enrollment.course.slug);
}

/** ADM11-PerCriterionReview's "Mark complete" / "Request resubmission" actions. "Mark complete"
 * goes through `applyEvidenceStatus('approved')` — the single gated-certification check point
 * (src/lib/actions/progress.ts) — so it throws the same error a bulk-approve would if a mandatory
 * criterion isn't Met yet; this screen is what lets Admin clear that before retrying. */
export async function finalizeCriterionReview(
  learnerId: string,
  courseSlug: string,
  decision: 'complete' | 'resubmit',
  overallNote?: string,
): Promise<void> {
  const admin = await requireAdmin();
  const status = decision === 'complete' ? 'approved' : 'rejected';
  await applyEvidenceStatus(admin, learnerId, courseSlug, status, overallNote);
  if (decision === 'resubmit') {
    await logAuditEvent({
      actor: admin,
      action: 'REQUEST_EVIDENCE_RESUBMISSION',
      targetType: 'EvidenceSubmission',
      metadata: { learnerId, courseSlug },
    });
  }
  revalidateReviewViews(learnerId, courseSlug);
}
