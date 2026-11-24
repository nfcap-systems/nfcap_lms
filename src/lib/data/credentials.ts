import { prisma } from '@/lib/prisma';
import type { AdminCourse } from './courses';
import type { EvidenceSubmission } from './progress';
import { getLearnerById } from './learners';

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
  /** The Certificate row's own id (not `certificateId`/certificateCode above) — what
   * `generateCertificatePublicSlug` needs to create or fetch LRN08-Certificates' public
   * verification link (LRN09-PublicVerify), matching the board's "See a sample verification
   * page" / earned-card-opens-Verify-view intent. */
  rawId: string;
  issuedAt: string;
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
    select: {
      id: true,
      certificateCode: true,
      issuedAt: true,
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
        rawId: cert.id,
        issuedAt: cert.issuedAt.toISOString(),
      };
    })
    .filter((c): c is Credential => c !== null)
    .sort((a, b) => a.course.pathwayOrder - b.course.pathwayOrder);
}

export type PublicCredential = {
  courseTitle: string;
  learnerName: string;
  certificateCode: string;
  issuedAt: string;
  /** Module count for LRN09-PublicVerify's "Issued using" line ("{N}-module course,
   * evidence-reviewed") — a scoped `_count`, not a new courseInclude call site. */
  moduleCount: number;
};

/** Public Verification Page + QR (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — no-login lookup by
 * the unguessable slug from `generateCertificatePublicSlug`. Deliberately returns the narrowest
 * shape a public page should ever show (no email, no internal ids) — a `null` result (unknown
 * slug, or a certificate whose owner revoked sharing) must render as "not found," never
 * distinguish the two, or revocation would leak that the slug was once valid. */
export async function getPublicCredentialBySlug(slug: string): Promise<PublicCredential | null> {
  const certificate = await prisma.certificate.findUnique({
    where: { publicSlug: slug },
    select: {
      certificateCode: true,
      issuedAt: true,
      enrollment: {
        select: {
          learnerId: true,
          course: { select: { title: true, _count: { select: { sections: true } } } },
        },
      },
    },
  });
  if (!certificate) return null;

  const learner = await getLearnerById(certificate.enrollment.learnerId);

  return {
    courseTitle: certificate.enrollment.course.title,
    moduleCount: certificate.enrollment.course._count.sections,
    learnerName: learner?.name || 'NFCAP Learner',
    certificateCode: certificate.certificateCode,
    issuedAt: certificate.issuedAt.toISOString(),
  };
}
