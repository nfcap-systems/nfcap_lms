import { prisma } from '@/lib/prisma';
import { getAllCourses } from './courses';
import { getLearnerRoster } from './learners';
import { getProgressByLearner } from './progress';

export type Cohort = {
  id: string;
  name: string;
  pathwayId: string | null;
  pathwayName: string | null;
  startDate: string;
  endDate: string | null;
  memberCount: number;
  /** % of this cohort's courses-in-pathway completed, averaged across members — 0 when the
   * cohort has no members yet rather than NaN. */
  avgCompletion: number;
  deadlines: { id: string; label: string; dueDate: string }[];
};

/** Cohorts & Deadlines (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — Admin's roster/dashboard view.
 * Narrow select per CLAUDE.md's performance conventions; member count via Prisma's `_count`
 * rather than loading every CohortMembership row. avgCompletion batches one progress fetch for
 * every member across every cohort, not one query per cohort ("no per-entity queries in a loop"). */
export async function getAllCohorts(): Promise<Cohort[]> {
  const cohorts = await prisma.cohort.findMany({
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      name: true,
      pathwayId: true,
      pathway: { select: { name: true } },
      startDate: true,
      endDate: true,
      deadlines: { select: { id: true, label: true, dueDate: true }, orderBy: { dueDate: 'asc' } },
      _count: { select: { memberships: true } },
      memberships: { select: { learnerId: true } },
    },
  });

  const allLearnerIds = [...new Set(cohorts.flatMap((c) => c.memberships.map((m) => m.learnerId)))];
  const [courses, progressByLearner] = await Promise.all([
    getAllCourses(),
    getProgressByLearner(allLearnerIds),
  ]);

  const completionFor = (learnerId: string): number | null => {
    const progress = progressByLearner[learnerId];
    if (!progress) return null;
    const enrolledAny = courses.some((c) => progress[c.id]?.enrolled);
    if (!enrolledAny) return null;
    const completed = courses.filter((c) => Boolean(progress[c.id]?.certificateId)).length;
    return (completed / courses.length) * 100;
  };

  return cohorts.map((c) => {
    const rates = c.memberships
      .map((m) => completionFor(m.learnerId))
      .filter((r): r is number => r !== null);
    const avgCompletion =
      rates.length === 0 ? 0 : Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);

    return {
      id: c.id,
      name: c.name,
      pathwayId: c.pathwayId,
      pathwayName: c.pathway?.name ?? null,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() ?? null,
      memberCount: c._count.memberships,
      avgCompletion,
      deadlines: c.deadlines.map((d) => ({
        id: d.id,
        label: d.label,
        dueDate: d.dueDate.toISOString(),
      })),
    };
  });
}

/** PRODUCT_CONTEXT.md §5 — exactly one pathway exists in this prototype, so the New Cohort
 * dialog auto-assigns it rather than showing a single-option dropdown that implies choice. */
export async function getDefaultPathwayId(): Promise<string | null> {
  const pathway = await prisma.pathway.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  return pathway?.id ?? null;
}

export type CohortMember = {
  id: string;
  name: string;
  email: string;
  progressPercent: number;
  status: 'active' | 'complete' | 'not-started';
};

/** One cohort's own member list with real per-learner pathway progress, for the roster table
 * under the cohort cards. Same batching shape as getAllCohorts — one roster fetch, one progress
 * batch, no per-member queries. */
export async function getCohortMembers(cohortId: string): Promise<CohortMember[]> {
  const [memberships, courses, roster] = await Promise.all([
    prisma.cohortMembership.findMany({ where: { cohortId }, select: { learnerId: true } }),
    getAllCourses(),
    getLearnerRoster(),
  ]);
  if (memberships.length === 0) return [];

  const learnerIds = memberships.map((m) => m.learnerId);
  const progressByLearner = await getProgressByLearner(learnerIds);
  const rosterById = new Map(roster.map((l) => [l.id, l]));

  return learnerIds.map((learnerId) => {
    const learner = rosterById.get(learnerId);
    const progress = progressByLearner[learnerId] ?? {};
    const enrolledAny = courses.some((c) => progress[c.id]?.enrolled);
    const completed = courses.filter((c) => Boolean(progress[c.id]?.certificateId)).length;
    const progressPercent =
      courses.length === 0 ? 0 : Math.round((completed / courses.length) * 100);

    return {
      id: learnerId,
      name: learner?.name ?? 'Unknown learner',
      email: learner?.email ?? '',
      progressPercent,
      status: !enrolledAny ? 'not-started' : completed === courses.length ? 'complete' : 'active',
    };
  });
}

/** Which cohort (if any) a learner currently belongs to — for the Learners roster's Cohort
 * column and the learner-detail Enrollment tab. Batched per CLAUDE.md's "no per-entity queries
 * in a loop": one query for every learnerId the caller is about to render, not one per row. */
export async function getCohortMembershipsForLearners(
  learnerIds: string[],
): Promise<Map<string, { cohortId: string; cohortName: string }>> {
  if (learnerIds.length === 0) return new Map();
  const memberships = await prisma.cohortMembership.findMany({
    where: { learnerId: { in: learnerIds } },
    select: { learnerId: true, cohortId: true, cohort: { select: { name: true } } },
  });
  return new Map(
    memberships.map((m) => [m.learnerId, { cohortId: m.cohortId, cohortName: m.cohort.name }]),
  );
}
