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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Learners</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Roster of all learners with progress visibility across the program.
        </p>
      </div>

      <LearnersRosterView
        learners={learners}
        courses={courses}
        progressByLearner={progressByLearner}
      />
    </div>
  );
}
