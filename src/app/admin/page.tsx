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
  const viewer = { userId: admin.id, role: 'ADMIN' as const };

  // getUpcomingWioaAppointments/getFundedCaseCount don't need the learner roster at all, but were
  // previously stuck in a second Promise.all batch gated entirely behind getLearnerRoster (a slow
  // Supabase Auth listUsers() call, not a DB query) resolving — paying its full latency before
  // even starting queries that had no real dependency on it. Only getProgressByLearner and
  // getFundingStatusForLearners genuinely need learner ids, so only those wait for the roster.
  const [courses, learners, upcomingAppointments, fundedCaseCount] = await Promise.all([
    getAllCourses(),
    getLearnerRoster(),
    getUpcomingWioaAppointments(viewer),
    getFundedCaseCount(viewer),
  ]);
  const [progressByLearner, fundingStatusByLearner] = await Promise.all([
    getProgressByLearner(learners.map((l) => l.id)),
    getFundingStatusForLearners(
      viewer,
      learners.map((l) => l.id),
    ),
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
