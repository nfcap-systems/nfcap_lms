import { connection } from 'next/server';
import { requireAdmin } from '@/lib/actions/guard';
import { getAllCourses } from '@/lib/data/courses';
import { getLearnerRoster } from '@/lib/data/learners';
import { getProgressByLearner } from '@/lib/data/progress';
import { getCohortMembershipsForLearners } from '@/lib/data/cohorts';
import { getFundingStatusForLearners, getFundedCaseCount } from '@/lib/data/wioa';
import { LearnersRosterView } from './LearnersRosterView';

export default async function AdminLearnersPage() {
  // See src/app/admin/page.tsx — the learner roster has no revalidatePath hook on signup, so
  // this render must stay dynamic.
  await connection();
  const admin = await requireAdmin();
  const viewer = { userId: admin.id, role: 'ADMIN' as const };

  // getFundedCaseCount doesn't need the learner roster at all — see src/app/admin/page.tsx for
  // the same fix. Running it alongside getLearnerRoster instead of gated behind it overlaps its
  // RLS query with the roster's slow Supabase Auth listUsers() call instead of paying both in
  // sequence.
  const [courses, learners, fundedCaseCount] = await Promise.all([
    getAllCourses(),
    getLearnerRoster(),
    getFundedCaseCount(viewer),
  ]);
  const learnerIds = learners.map((l) => l.id);
  const [progressByLearner, cohortMembershipByLearner, fundingStatusByLearner] = await Promise.all(
    [
      getProgressByLearner(learnerIds),
      getCohortMembershipsForLearners(learnerIds),
      getFundingStatusForLearners(viewer, learnerIds),
    ],
  );

  return (
    <LearnersRosterView
      learners={learners}
      courses={courses}
      progressByLearner={progressByLearner}
      cohortMembershipByLearner={cohortMembershipByLearner}
      fundingStatusByLearner={fundingStatusByLearner}
      fundedCaseCount={fundedCaseCount}
    />
  );
}
