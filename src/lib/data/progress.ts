import { prisma } from '@/lib/prisma';

export type QuizAttempt = { scorePercent: number; passed: boolean; submittedAt: string };
export type EvidenceStatus = 'pending' | 'approved' | 'rejected';
export type EvidenceSubmission = {
  id: string;
  description: string;
  fileName?: string;
  /** Any attachment exists on this submission — either the legacy course-level file or at least
   * one per-criterion capture (feature #9). Use it for "has an attachment" indicators only; it is
   * NOT a signal that `getEvidenceFileUrl(id)` will resolve. */
  hasFile: boolean;
  /** The legacy course-level file specifically — the only thing `getEvidenceFileUrl(id)` can
   * serve. False for every guided submission, whose files hang off CriterionAssessment instead
   * and are fetched with `getCriterionFileUrl` (docs/plans/phase-3-and-design-migration-kickoff.md
   * Step 2, feature #12). */
  hasSubmissionFile: boolean;
  /** Total photo count across the legacy course-level file (0 or 1) and every per-criterion
   * capture — the Review Queue's real "N photos" preview (ADM10), not a hardcoded "1". */
  fileCount: number;
  /** True when this submission was made through the per-criterion guided capture flow (feature
   * #9) — i.e. it has CriterionAssessment rows of its own. False for submissions made before that
   * flow existed, even on a course that has assessment criteria now: those still carry their
   * evidence in `description`/`fileName` and must keep rendering the legacy way. */
  isPerCriterion: boolean;
  status: EvidenceStatus;
  submittedAt: string;
  statusUpdatedAt?: string;
};
export type CourseProgress = {
  enrolled: boolean;
  enrolledAt: string;
  completedLessonIds: string[];
  quizAttempt?: QuizAttempt;
  /** Total persisted attempts for this enrollment, independent of `quizAttempt` (which is only the
   * latest one) — QuizFlow needs the count to know whether retakes remain, e.g. to decide whether
   * showing the correct answer on a failed attempt would leak it for a retake still in progress. */
  quizAttemptCount: number;
  evidence?: EvidenceSubmission;
  certificateId?: string;
};

const progressInclude = {
  completedLessons: true,
  quizAttempts: { orderBy: { submittedAt: 'desc' as const }, take: 1 },
  _count: { select: { quizAttempts: true } },
  evidenceSubmissions: {
    orderBy: { submittedAt: 'desc' as const },
    take: 1,
    // Narrow select, not the full relation: `hasFile` below needs to know only whether ANY
    // criterion has a learner-submitted photo (feature #9 — guided capture stores files here,
    // not on EvidenceSubmission.filePath, which stays null for every guided submission).
    include: { criterionAssessments: { select: { learnerFilePath: true } } },
  },
  certificate: true,
};

async function findEnrollment(learnerId: string, courseSlug: string) {
  return prisma.enrollment.findFirst({
    where: { learnerId, course: { slug: courseSlug } },
    include: progressInclude,
  });
}

type DbEnrollment = NonNullable<Awaited<ReturnType<typeof findEnrollment>>>;

function mapEnrollment(enrollment: DbEnrollment): CourseProgress {
  const quiz = enrollment.quizAttempts[0];
  const evidence = enrollment.evidenceSubmissions[0];
  return {
    enrolled: true,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    completedLessonIds: enrollment.completedLessons.map((c) => c.lessonId),
    quizAttemptCount: enrollment._count.quizAttempts,
    quizAttempt: quiz
      ? {
          scorePercent: quiz.scorePercent,
          passed: quiz.passed,
          submittedAt: quiz.submittedAt.toISOString(),
        }
      : undefined,
    evidence: evidence
      ? {
          id: evidence.id,
          description: evidence.description,
          fileName: evidence.fileName ?? undefined,
          hasFile:
            Boolean(evidence.filePath) ||
            evidence.criterionAssessments.some((ca) => Boolean(ca.learnerFilePath)),
          hasSubmissionFile: Boolean(evidence.filePath),
          fileCount:
            (evidence.filePath ? 1 : 0) +
            evidence.criterionAssessments.filter((ca) => Boolean(ca.learnerFilePath)).length,
          isPerCriterion: evidence.criterionAssessments.length > 0,
          status: evidence.status.toLowerCase() as EvidenceStatus,
          submittedAt: evidence.submittedAt.toISOString(),
          statusUpdatedAt: evidence.statusUpdatedAt?.toISOString(),
        }
      : undefined,
    certificateId: enrollment.certificate?.certificateCode,
  };
}

/** A learner's progress on one course, or undefined if they've never enrolled. */
export async function getCourseProgress(
  learnerId: string,
  courseSlug: string,
): Promise<CourseProgress | undefined> {
  const enrollment = await findEnrollment(learnerId, courseSlug);
  return enrollment ? mapEnrollment(enrollment) : undefined;
}

/** All of a learner's progress, keyed by course slug — one query for pages that render every
 * course at once (Home, My Learning, Admin's learner detail) instead of N queries. */
export async function getLearnerProgressMap(
  learnerId: string,
): Promise<Record<string, CourseProgress>> {
  const enrollments = await prisma.enrollment.findMany({
    where: { learnerId },
    include: { ...progressInclude, course: { select: { slug: true } } },
  });
  const result: Record<string, CourseProgress> = {};
  for (const enrollment of enrollments) {
    result[enrollment.course.slug] = mapEnrollment(enrollment);
  }
  return result;
}

/** Admin views that render every learner's progress at once (Dashboard, Learners roster) — one
 * query for every learner's enrollments, grouped in memory, instead of one query per learner. */
export async function getProgressByLearner(
  learnerIds: string[],
): Promise<Record<string, Record<string, CourseProgress>>> {
  const result: Record<string, Record<string, CourseProgress>> = {};
  for (const id of learnerIds) result[id] = {};

  if (learnerIds.length === 0) return result;

  const enrollments = await prisma.enrollment.findMany({
    where: { learnerId: { in: learnerIds } },
    include: { ...progressInclude, course: { select: { slug: true } } },
  });
  for (const enrollment of enrollments) {
    result[enrollment.learnerId][enrollment.course.slug] = mapEnrollment(enrollment);
  }
  return result;
}

/** Count of enrollments whose most recent evidence submission is still pending — Admin's sidebar
 * promo banner. Narrow select (just the latest status per enrollment), not the full roster+
 * progress scan /admin/reviews' page.tsx does to build the actual queue rows. */
export async function getPendingReviewCount(): Promise<number> {
  const enrollments = await prisma.enrollment.findMany({
    select: {
      evidenceSubmissions: { orderBy: { submittedAt: 'desc' }, take: 1, select: { status: true } },
    },
  });
  return enrollments.filter((e) => e.evidenceSubmissions[0]?.status === 'PENDING').length;
}

export type CourseUnlockRecord = { source: 'WIOA_FUNDING' | 'ADMIN_ASSIGNMENT'; grantedAt: Date };

/** A learner's RESTRICTED-course unlocks, keyed by course slug — feeds Admin's course-assignment
 * UI (docs/build/WIOA_BUILD_WORKFLOW.md Phase 4) so it can show which restricted courses are already
 * unlocked, and why, without a separate query per course. */
export async function getCourseUnlocksForLearner(
  learnerId: string,
): Promise<Record<string, CourseUnlockRecord>> {
  const unlocks = await prisma.courseUnlock.findMany({
    where: { learnerId },
    include: { course: { select: { slug: true } } },
  });
  const result: Record<string, CourseUnlockRecord> = {};
  for (const u of unlocks) {
    result[u.course.slug] = { source: u.source, grantedAt: u.grantedAt };
  }
  return result;
}
