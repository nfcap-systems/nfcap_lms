import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LessonPlayerView } from '@/components/learner/LessonPlayerView';
import { RestrictedCourseNotice } from '@/components/learner/RestrictedCourseNotice';
import { getCourseBySlug } from '@/lib/data/courses';
import { getCourseProgress, getCourseUnlocksForLearner } from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(courseId), getAuthUser()]);
  if (!course || !user) notFound();

  const [progress, unlocks] = await Promise.all([
    getCourseProgress(user.id, courseId),
    getCourseUnlocksForLearner(user.id),
  ]);

  // Same access rule as `getOrCreateEnrollment` (src/lib/actions/progress.ts), checked here too —
  // not just `enrolled` — because a stale Enrollment row predating this restriction (or from an
  // admin demo flow) would otherwise let a learner into the player only to have
  // `markLessonComplete` throw on every attempt.
  if (course.access === 'restricted' && !unlocks[courseId]) {
    return <RestrictedCourseNotice courseTitle={course.title} />;
  }

  if (!progress?.enrolled) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-[var(--ink-muted)]">You&apos;re not enrolled in this course.</p>
        <Link
          href={`/learner/courses/${courseId}`}
          className="text-sm font-medium text-[var(--nfcap-accent)] hover:underline"
        >
          Back to {course.title}
        </Link>
      </div>
    );
  }

  return (
    <LessonPlayerView
      course={course}
      lessonId={lessonId}
      completedLessonIds={progress.completedLessonIds}
      quizPassed={progress.quizAttempt?.passed ?? false}
    />
  );
}
