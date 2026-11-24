import { prisma } from '@/lib/prisma';

export type Cohort = {
  id: string;
  name: string;
  pathwayId: string | null;
  pathwayName: string | null;
  startDate: string;
  endDate: string | null;
  memberCount: number;
  deadlines: { id: string; label: string; dueDate: string }[];
};

/** Cohorts & Deadlines (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — Admin's roster/dashboard view.
 * Narrow select per CLAUDE.md's performance conventions; member count via Prisma's `_count`
 * rather than loading every CohortMembership row. */
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
    },
  });

  return cohorts.map((c) => ({
    id: c.id,
    name: c.name,
    pathwayId: c.pathwayId,
    pathwayName: c.pathway?.name ?? null,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    memberCount: c._count.memberships,
    deadlines: c.deadlines.map((d) => ({
      id: d.id,
      label: d.label,
      dueDate: d.dueDate.toISOString(),
    })),
  }));
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
