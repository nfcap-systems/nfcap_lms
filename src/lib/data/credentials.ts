import { prisma } from '@/lib/prisma';
import type { AdminCourse } from './courses';
import type { EvidenceSubmission } from './progress';

/** One criterion's own capture on a guided submission (feature #9) — what the learner actually
 * showed for it. Empty for legacy submissions, whose evidence lives on the submission itself. */
export type CredentialCriterion = {
  criterionAssessmentId: string;
  title: string;
  description?: string;
  fileName?: string;
  hasFile: boolean;
};

export type Credential = {
  course: AdminCourse;
  evidence: EvidenceSubmission;
  /** Per-criterion captures, in criterion order, for a guided submission; empty for a legacy one.
   * Without this the Portfolio renders a guided submission as a blank card, since the submission's
   * own `description`/`fileName` are empty by design on that path
   * (docs/plans/phase-3-and-design-migration-kickoff.md Step 2, feature #12). */
  criteria: CredentialCriterion[];
  certificateId: string;
};

/** Courses whose Practical Evidence has been verified — the payoff loop's completion state
 * (docs/product/PRODUCT_CONTEXT.md Section 5). Reads the materialized Certificate row (set on approval
 * by src/lib/actions/progress.ts's setEvidenceStatus), not a derived filter. */
export async function getCredentialsForLearner(
  learnerId: string,
  courses: AdminCourse[],
): Promise<Credential[]> {
  const certificates = await prisma.certificate.findMany({
    where: { enrollment: { learnerId } },
    include: {
      enrollment: { include: { course: { select: { slug: true } } } },
      evidenceSubmission: {
        include: {
          criterionAssessments: {
            include: { criterion: { select: { title: true, order: true } } },
          },
        },
      },
    },
  });

  const courseBySlug = new Map(courses.map((c) => [c.id, c]));

  return certificates
    .map((cert): Credential | null => {
      const course = courseBySlug.get(cert.enrollment.course.slug);
      if (!course) return null;
      const evidence = cert.evidenceSubmission;
      const assessments = [...evidence.criterionAssessments].sort(
        (a, b) => a.criterion.order - b.criterion.order,
      );
      return {
        course,
        evidence: {
          id: evidence.id,
          description: evidence.description,
          fileName: evidence.fileName ?? undefined,
          hasFile:
            Boolean(evidence.filePath) || assessments.some((a) => Boolean(a.learnerFilePath)),
          hasSubmissionFile: Boolean(evidence.filePath),
          isPerCriterion: assessments.length > 0,
          status: evidence.status.toLowerCase() as EvidenceSubmission['status'],
          submittedAt: evidence.submittedAt.toISOString(),
          statusUpdatedAt: evidence.statusUpdatedAt?.toISOString(),
        },
        criteria: assessments.map((a) => ({
          criterionAssessmentId: a.id,
          title: a.criterion.title,
          description: a.learnerDescription ?? undefined,
          fileName: a.learnerFileName ?? undefined,
          hasFile: Boolean(a.learnerFilePath),
        })),
        certificateId: cert.certificateCode,
      };
    })
    .filter((c): c is Credential => c !== null)
    .sort((a, b) => a.course.pathwayOrder - b.course.pathwayOrder);
}
