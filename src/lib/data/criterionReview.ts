import { prisma } from '@/lib/prisma';
import type { EvidenceStatus } from './progress';
import type { AnnotationMark } from '@/lib/types/annotation';

export type CriterionVerdict = {
  criterionId: string;
  title: string;
  guidance: string;
  photoRequired: boolean;
  mandatoryForCertification: boolean;
  /** Null until a reviewer records a verdict for this criterion on this submission. */
  met: boolean | null;
  reviewerNote?: string;
  /** The learner's own per-criterion capture (feature #9, LRN06b/c-EvidenceCapture). Undefined
   * `criterionAssessmentId` means the learner hasn't captured this criterion on the current
   * submission yet (no CriterionAssessment row exists). */
  criterionAssessmentId?: string;
  hasLearnerFile: boolean;
  learnerFileName?: string;
  learnerDescription?: string;
  submittedAt?: string;
  /** Reviewer's annotation overlay on the learner's photo (feature #8). Reviewer-only. */
  annotationData?: AnnotationMark[] | null;
};

export type CriterionReviewData = {
  evidenceSubmissionId: string;
  description: string;
  fileName?: string;
  hasFile: boolean;
  status: EvidenceStatus;
  submittedAt: string;
  overallNote?: string;
  criteria: CriterionVerdict[];
};

/** The latest evidence submission for a learner's course, joined with that course's assessment
 * criteria and whatever per-criterion verdicts/captures already exist on this specific submission
 * (features #7 and #9 — ADM11-PerCriterionReview and LRN06b/c-EvidenceCapture are the literal
 * specs). Returns undefined if the learner has never submitted evidence for this course; criteria
 * still render (unreviewed, `met: null`) even when the course has none assessed yet or the
 * submission predates this feature. */
export async function getCriterionReview(
  learnerId: string,
  courseSlug: string,
): Promise<CriterionReviewData | undefined> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { learnerId, course: { slug: courseSlug } },
    include: {
      evidenceSubmissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        include: { criterionAssessments: true },
      },
      course: {
        select: {
          assessmentCriteria: { orderBy: { order: 'asc' } },
        },
      },
    },
  });
  const evidence = enrollment?.evidenceSubmissions[0];
  if (!enrollment || !evidence) return undefined;

  const verdictByCriterionId = new Map(
    evidence.criterionAssessments.map((a) => [a.criterionId, a]),
  );

  return {
    evidenceSubmissionId: evidence.id,
    description: evidence.description,
    fileName: evidence.fileName ?? undefined,
    hasFile: Boolean(evidence.filePath),
    status: evidence.status.toLowerCase() as EvidenceStatus,
    submittedAt: evidence.submittedAt.toISOString(),
    overallNote: evidence.reviewerNote ?? undefined,
    criteria: enrollment.course.assessmentCriteria.map((criterion) => {
      const verdict = verdictByCriterionId.get(criterion.id);
      return {
        criterionId: criterion.id,
        title: criterion.title,
        guidance: criterion.guidance,
        photoRequired: criterion.photoRequired,
        mandatoryForCertification: criterion.mandatoryForCertification,
        met: verdict?.met ?? null,
        reviewerNote: verdict?.reviewerNote ?? undefined,
        criterionAssessmentId: verdict?.id,
        hasLearnerFile: Boolean(verdict?.learnerFilePath),
        learnerFileName: verdict?.learnerFileName ?? undefined,
        learnerDescription: verdict?.learnerDescription ?? undefined,
        submittedAt: verdict?.submittedAt?.toISOString(),
        annotationData: (verdict?.annotationData as AnnotationMark[] | null | undefined) ?? null,
      };
    }),
  };
}
