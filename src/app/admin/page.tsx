import { connection } from 'next/server';
import { requireAdmin } from '@/lib/actions/guard';
import { getAllCourses } from '@/lib/data/courses';
import { getLearnerRoster } from '@/lib/data/learners';
import { getProgressByLearner } from '@/lib/data/progress';
import {
  getUpcomingWioaAppointments,
  getFundingStatusForLearners,
  getFundedCaseCount,
} from '@/lib/data/wioa';
import { DashboardView } from './DashboardView';

export default async function AdminDashboardPage() {
  // Learner roster comes from Supabase Auth directly (src/lib/data/learners.ts) — a new signup
  // has no revalidatePath hook, so this render must stay dynamic rather than being statically
  // prerendered at build time. connection() is the scoped way to say that (replaces the old
  // route-level `export const dynamic = 'force-dynamic'`, which `cacheComponents` disallows —
  // docs/build/PERFORMANCE_PLAN.md §5.1).
  await connection();
  const admin = await requireAdmin();
  const [courses, learners] = await Promise.all([getAllCourses(), getLearnerRoster()]);
  const viewer = { userId: admin.id, role: 'ADMIN' as const };
  const [progressByLearner, upcomingAppointments, fundingStatusByLearner, fundedCaseCount] =
    await Promise.all([
      getProgressByLearner(learners.map((l) => l.id)),
      getUpcomingWioaAppointments(viewer),
      getFundingStatusForLearners(
        viewer,
        learners.map((l) => l.id),
      ),
      getFundedCaseCount(viewer),
    ]);

  const adminName =
    typeof admin.user_metadata?.name === 'string' ? admin.user_metadata.name : 'Admin';

  return (
    <div className="flex flex-col gap-6">
      <DashboardView
        courses={courses}
        learners={learners}
        progressByLearner={progressByLearner}
        upcomingAppointments={upcomingAppointments}
        fundingStatusByLearner={fundingStatusByLearner}
        fundedCaseCount={fundedCaseCount}
        adminName={adminName}
      />
    </div>
  );
}
