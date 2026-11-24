import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EvidenceView } from '@/components/learner/EvidenceView';
import { RestrictedCourseNotice } from '@/components/learner/RestrictedCourseNotice';
import { getAssessmentCriteria, getCourseBySlug } from '@/lib/data/courses';
import { getCourseProgress, getCourseUnlocksForLearner } from '@/lib/data/progress';
import { getCriterionReview } from '@/lib/data/criterionReview';
import { getResubmissionContext } from '@/lib/data/criterionAttempts';
import { getAuthUser } from '@/lib/supabase/server';

/** LRN06-EvidenceCriteria family — unchanged internals (Phase 3, already matches its boards), just
 * relocated from a step inside the old combined CourseLearningView to its own route. */
export default async function EvidencePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(courseId), getAuthUser()]);
  if (!course || !user) notFound();

  const [progress, criteria, unlocks] = await Promise.all([
    getCourseProgress(user.id, courseId),
    getAssessmentCriteria(courseId),
    getCourseUnlocksForLearner(user.id),
  ]);

  // Same access rule as `getOrCreateEnrollment` (src/lib/actions/progress.ts) — see
  // learn/[lessonId]/page.tsx for why this can't rely on `enrolled` alone.
  if (course.access === 'restricted' && !unlocks[courseId]) {
    return <RestrictedCourseNotice courseTitle={course.title} />;
  }

  if (!progress?.enrolled || !progress.quizAttempt?.passed) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-[var(--ink-muted)]">
          Pass the Module Quiz before submitting Practical Evidence.
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

  // Only fetched once evidence exists — getCriterionReview itself returns undefined otherwise,
  // but no point running its enrollment lookup when there's nothing for it to find.
  const [criterionReview, resubmission] = progress.evidence
    ? await Promise.all([
        getCriterionReview(user.id, courseId),
        progress.evidence.status === 'rejected'
          ? getResubmissionContext(user.id, courseId)
          : undefined,
      ])
    : [undefined, undefined];

  return (
    <EvidenceView
      course={course}
      evidence={progress.evidence}
      criteria={criteria}
      criterionVerdicts={criterionReview?.criteria}
      resubmission={resubmission}
    />
  );
}
