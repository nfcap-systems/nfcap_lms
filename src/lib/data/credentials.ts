import { prisma } from '@/lib/prisma';
import type { AdminCourse } from './courses';
import type { EvidenceSubmission } from './progress';

export type Credential = {
  course: AdminCourse;
  evidence: EvidenceSubmission;
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
      evidenceSubmission: true,
    },
  });

  const courseBySlug = new Map(courses.map((c) => [c.id, c]));

  return certificates
    .map((cert): Credential | null => {
      const course = courseBySlug.get(cert.enrollment.course.slug);
      if (!course) return null;
      const evidence = cert.evidenceSubmission;
      return {
        course,
        evidence: {
          description: evidence.description,
          fileName: evidence.fileName ?? undefined,
          status: evidence.status.toLowerCase() as EvidenceSubmission['status'],
          submittedAt: evidence.submittedAt.toISOString(),
          statusUpdatedAt: evidence.statusUpdatedAt?.toISOString(),
        },
        certificateId: cert.certificateCode,
      };
    })
    .filter((c): c is Credential => c !== null)
    .sort((a, b) => a.course.pathwayOrder - b.course.pathwayOrder);
}
