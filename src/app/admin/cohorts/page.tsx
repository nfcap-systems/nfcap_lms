import { requireAdmin } from '@/lib/actions/guard';
import { getAllCohorts, getCohortMembers, getDefaultPathwayId } from '@/lib/data/cohorts';
import { getLearnerRoster } from '@/lib/data/learners';
import { CohortsView } from './CohortsView';

export default async function AdminCohortsPage() {
  await requireAdmin();
  const [cohorts, pathwayId, learners] = await Promise.all([
    getAllCohorts(),
    getDefaultPathwayId(),
    getLearnerRoster(),
  ]);
  const membersByCohort = Object.fromEntries(
    await Promise.all(cohorts.map(async (c) => [c.id, await getCohortMembers(c.id)] as const)),
  );

  return (
    <CohortsView
      cohorts={cohorts}
      membersByCohort={membersByCohort}
      pathwayId={pathwayId}
      learners={learners}
    />
  );
}
