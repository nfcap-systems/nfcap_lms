import Link from 'next/link';
import { CourseOverviewView } from '@/components/learner/CourseOverviewView';
import { getCourseBySlug, getPublishedCourses } from '@/lib/data/courses';
import {
  getCourseProgress,
  getCourseUnlocksForLearner,
  type CourseUnlockRecord,
} from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';

/** LRN03-CourseOverview — the course landing page. Lessons, the quiz, and evidence submission
 * each live at their own discrete route now (docs/build/LRN_BATCH_DRIFT.md); this page only
 * shows the syllabus and routes onward via its own Continue button. */
export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [course, user, published] = await Promise.all([
    getCourseBySlug(courseId),
    getAuthUser(),
    getPublishedCourses(),
  ]);

  if (!course) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-[var(--ink-muted)]">Course not found.</p>
        <Link
          href="/learner/explore"
          className="text-sm font-medium text-[var(--nfcap-accent)] hover:underline"
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
    ? await Promise.all([getCourseProgress(user.id, courseId), getCourseUnlocksForLearner(user.id)])
    : [undefined, {}];

  const pathway = [...published].sort((a, b) => a.pathwayOrder - b.pathwayOrder);
  const moduleIndex = pathway.findIndex((c) => c.id === course.id);

  return (
    <CourseOverviewView
      course={course}
      progress={progress}
      unlocked={Boolean(unlocks[courseId])}
      moduleNumber={moduleIndex >= 0 ? moduleIndex + 1 : 1}
      moduleTotal={pathway.length || 1}
    />
  );
}
