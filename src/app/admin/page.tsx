import { getAllCourses } from '@/lib/data/courses';
import { getLearnerRoster } from '@/lib/data/learners';
import { getProgressByLearner } from '@/lib/data/progress';
import { DashboardView } from './DashboardView';

// Learner roster comes from Supabase Auth directly (src/lib/data/learners.ts) — a new signup has
// no revalidatePath hook, so this page must render fresh every request rather than being
// statically prerendered at build time.
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [courses, learners] = await Promise.all([getAllCourses(), getLearnerRoster()]);
  const progressByLearner = await getProgressByLearner(learners.map((l) => l.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          At-a-glance view of learner activity, pending evidence reviews, and program status.
        </p>
      </div>

      <DashboardView courses={courses} learners={learners} progressByLearner={progressByLearner} />
    </div>
  );
}
