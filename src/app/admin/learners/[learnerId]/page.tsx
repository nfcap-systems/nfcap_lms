import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/actions/guard';
import { getLearnerById } from '@/lib/data/learners';
import { getAllCourses, getCriteriaCountsByCourseSlug } from '@/lib/data/courses';
import { getLearnerProgressMap, getCourseUnlocksForLearner } from '@/lib/data/progress';
import { getCohortMembershipsForLearners, getCohortOptions } from '@/lib/data/cohorts';
import {
  getFundingStatusForLearners,
  getWioaCasesForLearner,
  getLearnerProfile,
} from '@/lib/data/wioa';
import { getCredentialsForLearner } from '@/lib/data/credentials';
import { getCriterionReview } from '@/lib/data/criterionReview';
import { getCourseStatus } from '@/lib/course-status';
import { LearnerProfileView } from '@/components/admin/LearnerProfileView';

export default async function AdminLearnerProfilePage({
  params,
}: {
  params: Promise<{ learnerId: string }>;
}) {
  const { learnerId } = await params;
  const learner = await getLearnerById(learnerId);
  if (!learner) notFound();

  const admin = await requireAdmin();
  const viewer = { userId: admin.id, role: 'ADMIN' as const };

  const [
    courses,
    progress,
    courseUnlocks,
    criteriaCounts,
    cohortMembershipByLearner,
    fundingStatusByLearner,
    wioaCases,
    learnerProfile,
  ] = await Promise.all([
    getAllCourses(),
    getLearnerProgressMap(learnerId),
    getCourseUnlocksForLearner(learnerId),
    getCriteriaCountsByCourseSlug(),
    getCohortMembershipsForLearners([learnerId]),
    getFundingStatusForLearners(viewer, [learnerId]),
    getWioaCasesForLearner(viewer, learnerId),
    getLearnerProfile(viewer, learnerId),
  ]);
  const credentials = await getCredentialsForLearner(learnerId, courses);
  // Sequential, not batched into the Promise.all above — this page already runs 8 concurrent
  // queries against a 4-connection pool (src/lib/prisma.ts); the cohort dropdown's own list
  // isn't on the critical path for first paint of anything else on this page.
  const cohortOptions = await getCohortOptions();

  const enrolledCourses = courses.filter((c) => progress[c.id]?.enrolled);
  // The Overview/Evidence tabs' "current course" — first enrolled course not yet verified, or
  // the first enrolled course if everything's already verified.
  const currentCourse =
    enrolledCourses.find((c) => getCourseStatus(c, progress[c.id]) !== 'verified') ??
    enrolledCourses[0] ??
    null;

  const currentCourseCriteriaReview =
    currentCourse && (criteriaCounts[currentCourse.id] ?? 0) > 0
      ? await getCriterionReview(learnerId, currentCourse.id)
      : undefined;

  return (
    <LearnerProfileView
      learner={learner}
      courses={courses}
      progress={progress}
      courseUnlocks={courseUnlocks}
      criteriaCounts={criteriaCounts}
      cohortName={cohortMembershipByLearner.get(learnerId)?.cohortName ?? null}
      cohortId={cohortMembershipByLearner.get(learnerId)?.cohortId ?? null}
      cohorts={cohortOptions}
      fundingStatus={fundingStatusByLearner[learnerId] ?? 'self_pay'}
      wioaCases={wioaCases}
      credentials={credentials}
      learnerProfile={learnerProfile}
      currentCourse={currentCourse}
      currentCourseCriteriaReview={currentCourseCriteriaReview}
    />
  );
}
