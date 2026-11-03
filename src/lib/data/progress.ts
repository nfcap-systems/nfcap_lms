import { prisma } from '@/lib/prisma';

export type QuizAttempt = { scorePercent: number; passed: boolean; submittedAt: string };
export type EvidenceStatus = 'pending' | 'approved' | 'rejected';
export type EvidenceSubmission = {
  description: string;
  fileName?: string;
  status: EvidenceStatus;
  submittedAt: string;
  statusUpdatedAt?: string;
};
export type CourseProgress = {
  enrolled: boolean;
  completedLessonIds: string[];
  quizAttempt?: QuizAttempt;
  evidence?: EvidenceSubmission;
  certificateId?: string;
};

const progressInclude = {
  completedLessons: true,
  quizAttempts: { orderBy: { submittedAt: 'desc' as const }, take: 1 },
  evidenceSubmissions: { orderBy: { submittedAt: 'desc' as const }, take: 1 },
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
    completedLessonIds: enrollment.completedLessons.map((c) => c.lessonId),
    quizAttempt: quiz
      ? {
          scorePercent: quiz.scorePercent,
          passed: quiz.passed,
          submittedAt: quiz.submittedAt.toISOString(),
        }
      : undefined,
    evidence: evidence
      ? {
          description: evidence.description,
          fileName: evidence.fileName ?? undefined,
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
