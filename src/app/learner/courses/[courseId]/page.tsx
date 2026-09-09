import Link from 'next/link';
import { CourseLearningView } from '@/components/learner/CourseLearningView';
import { getCourseBySlug } from '@/lib/data/courses';
import {
  getCourseProgress,
  getCourseUnlocksForLearner,
  type CourseUnlockRecord,
} from '@/lib/data/progress';
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
        <p className="text-sm text-text-secondary">Course not found.</p>
        <Link
          href="/learner/explore"
          className="text-sm font-medium text-brand-primary hover:underline"
        >
          Back to Course Catalog
        </Link>
      </div>
    );
  }

  const [progress, unlocks]: [
    Awaited<ReturnType<typeof getCourseProgress>>,
    Record<string, CourseUnlockRecord>,
  ] = user
    ? await Promise.all([
        getCourseProgress(user.id, courseId),
        getCourseUnlocksForLearner(user.id),
      ])
    : [undefined, {}];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {course.category}
        </p>
        <h1 className="text-xl font-semibold text-brand-heading">{course.title}</h1>
      </div>
      <CourseLearningView
        course={course}
        progress={progress}
        unlocked={Boolean(unlocks[courseId])}
      />
    </div>
  );
}
