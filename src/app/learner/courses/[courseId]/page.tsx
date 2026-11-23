import Link from 'next/link';
import { CourseLearningView } from '@/components/learner/CourseLearningView';
import { getAssessmentCriteria, getCourseBySlug } from '@/lib/data/courses';
import {
  getCourseProgress,
  getCourseUnlocksForLearner,
  type CourseUnlockRecord,
} from '@/lib/data/progress';
import { getCriterionReview } from '@/lib/data/criterionReview';
import { getResubmissionContext } from '@/lib/data/criterionAttempts';
import { getAuthUser } from '@/lib/supabase/server';

export default async function CourseLearningPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(courseId), getAuthUser()]);

  if (!course) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-[var(--ink-muted)]">Course not found.</p>
        <Link
          href="/learner/explore"
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Back to Course Catalog
        </Link>
      </div>
    );
  }

  const [progress, unlocks, criteria]: [
    Awaited<ReturnType<typeof getCourseProgress>>,
    Record<string, CourseUnlockRecord>,
    Awaited<ReturnType<typeof getAssessmentCriteria>>,
  ] = user
    ? await Promise.all([
        getCourseProgress(user.id, courseId),
        getCourseUnlocksForLearner(user.id),
        getAssessmentCriteria(courseId),
      ])
    : [undefined, {}, []];

  // Only fetched once evidence exists — getCriterionReview itself returns undefined otherwise,
  // but no point running its enrollment lookup when there's nothing for it to find.
  const [criterionReview, resubmission] =
    user && progress?.evidence
      ? await Promise.all([
          getCriterionReview(user.id, courseId),
          progress.evidence.status === 'rejected'
            ? getResubmissionContext(user.id, courseId)
            : undefined,
        ])
      : [undefined, undefined];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
          {course.category}
        </p>
        <h1 className="text-xl font-semibold text-[var(--ink)]">{course.title}</h1>
      </div>
      <CourseLearningView
        course={course}
        progress={progress}
        unlocked={Boolean(unlocks[courseId])}
        criteria={criteria}
        criterionVerdicts={criterionReview?.criteria}
        resubmission={resubmission}
      />
    </div>
  );
}
