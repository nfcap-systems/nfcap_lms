import { connection } from 'next/server';
import { getAllCourses } from '@/lib/data/courses';
import { getLearnerRoster } from '@/lib/data/learners';
import { getProgressByLearner } from '@/lib/data/progress';
import { LearnersRosterView } from './LearnersRosterView';

export default async function AdminLearnersPage() {
  // See src/app/admin/page.tsx — the learner roster has no revalidatePath hook on signup, so
  // this render must stay dynamic.
  await connection();
  const [courses, learners] = await Promise.all([getAllCourses(), getLearnerRoster()]);
  const progressByLearner = await getProgressByLearner(learners.map((l) => l.id));

  return (
    <LearnersRosterView learners={learners} courses={courses} progressByLearner={progressByLearner} />
  );
}
