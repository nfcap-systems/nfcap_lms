import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QuizFlow } from '@/components/learner/QuizFlow';
import { RestrictedCourseNotice } from '@/components/learner/RestrictedCourseNotice';
import { getCourseBySlug } from '@/lib/data/courses';
import { getCourseProgress, getCourseUnlocksForLearner } from '@/lib/data/progress';
import { getAuthUser } from '@/lib/supabase/server';

export default async function QuizPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(courseId), getAuthUser()]);
  if (!course || !user) notFound();

  const [progress, unlocks] = await Promise.all([
    getCourseProgress(user.id, courseId),
    getCourseUnlocksForLearner(user.id),
  ]);

  // Same access rule as `getOrCreateEnrollment` (src/lib/actions/progress.ts) — see
  // learn/[lessonId]/page.tsx for why this can't rely on `enrolled` alone.
  if (course.access === 'restricted' && !unlocks[courseId]) {
    return <RestrictedCourseNotice courseTitle={course.title} />;
  }

  const total = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const done = progress?.completedLessonIds.length ?? 0;

  if (!progress?.enrolled || done < total) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-[var(--ink-muted)]">
          Finish every lesson before starting the quiz.
        </p>
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
    <QuizFlow course={course} assessment={course.assessment} lastAttempt={progress.quizAttempt} />
  );
}
