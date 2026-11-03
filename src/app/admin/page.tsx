import { connection } from 'next/server';
import { getAllCourses } from '@/lib/data/courses';
import { getLearnerRoster } from '@/lib/data/learners';
import { getProgressByLearner } from '@/lib/data/progress';
import { DashboardView } from './DashboardView';

export default async function AdminDashboardPage() {
  // Learner roster comes from Supabase Auth directly (src/lib/data/learners.ts) — a new signup
  // has no revalidatePath hook, so this render must stay dynamic rather than being statically
  // prerendered at build time. connection() is the scoped way to say that (replaces the old
  // route-level `export const dynamic = 'force-dynamic'`, which `cacheComponents` disallows —
  // docs/build/PERFORMANCE_PLAN.md §5.1).
  await connection();
  const [courses, learners] = await Promise.all([getAllCourses(), getLearnerRoster()]);
  const progressByLearner = await getProgressByLearner(learners.map((l) => l.id));

  return (
    <div className="flex flex-col gap-6">
      <DashboardView courses={courses} learners={learners} progressByLearner={progressByLearner} />
    </div>
  );
}
