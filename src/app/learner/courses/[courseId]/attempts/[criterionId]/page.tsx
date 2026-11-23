import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AttemptHistoryView } from '@/components/learner/AttemptHistoryView';
import { getCriterionAttemptHistory } from '@/lib/data/criterionAttempts';
import { getCourseBySlug } from '@/lib/data/courses';
import { getAuthUser } from '@/lib/supabase/server';

/** Feature #11 — LRN06f-AttemptHistory. Always scoped to the signed-in learner's own enrollment
 * (see `getCriterionAttemptHistory`), so a criterion id from the URL can't expose anyone else's. */
export default async function AttemptHistoryPage({
  params,
}: {
  params: Promise<{ courseId: string; criterionId: string }>;
}) {
  const { courseId, criterionId } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(courseId), getAuthUser()]);
  if (!course || !user) notFound();

  const history = await getCriterionAttemptHistory(user.id, courseId, criterionId);
  if (!history) notFound();

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <Link
        href={`/learner/courses/${course.id}`}
        className="text-sm font-medium text-[var(--nfcap-accent)] hover:underline"
      >
        &larr; Back to {course.title}
      </Link>
      <AttemptHistoryView courseTitle={course.title} history={history} />
    </div>
  );
}
