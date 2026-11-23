import { connection } from 'next/server';
import { getAllCourses } from '@/lib/data/courses';
import { getLearnerRoster } from '@/lib/data/learners';
import { getProgressByLearner } from '@/lib/data/progress';
import { ReviewQueueView, type ReviewQueueRow } from './ReviewQueueView';

export default async function AdminReviewQueuePage() {
  // Learner roster comes from Supabase Auth directly (src/lib/data/learners.ts) — same dynamic
  // requirement as /admin and /admin/learners (see those pages' comments).
  await connection();
  const [courses, learners] = await Promise.all([getAllCourses(), getLearnerRoster()]);
  const progressByLearner = await getProgressByLearner(learners.map((l) => l.id));

  const pending: ReviewQueueRow[] = [];
  let approvedToday = 0;
  let rejectedToday = 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  for (const learner of learners) {
    const progress = progressByLearner[learner.id] ?? {};
    for (const course of courses) {
      const evidence = progress[course.id]?.evidence;
      if (!evidence) continue;

      if (evidence.status === 'pending') {
        pending.push({
          evidenceId: evidence.id,
          learnerId: learner.id,
          learnerName: learner.name,
          // AdminCourse.id is the course slug (src/lib/data/courses.ts's mapCourse), so this
          // doubles as the slug setEvidenceStatus/bulkApproveEvidence expect — no separate field.
          courseId: course.id,
          courseTitle: course.title,
          submittedAt: evidence.submittedAt,
          hasFile: evidence.hasFile,
        });
      } else if (evidence.statusUpdatedAt && new Date(evidence.statusUpdatedAt) >= todayStart) {
        if (evidence.status === 'approved') approvedToday += 1;
        else if (evidence.status === 'rejected') rejectedToday += 1;
      }
    }
  }

  pending.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  return (
    <ReviewQueueView rows={pending} approvedToday={approvedToday} rejectedToday={rejectedToday} />
  );
}
