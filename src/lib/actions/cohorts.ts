'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from './guard';
import { logAuditEvent } from './audit';

/** Cohorts & Deadlines (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — Admin-only, same shape as
 * curriculum.ts's authoring actions. No UI wired to these yet (ADM13-Cohorts is not built,
 * Layer 3B); these exist so the data layer and the board can land in separate, independently
 * verifiable steps. */

export async function createCohort(params: {
  name: string;
  pathwayId?: string | null;
  startDate: Date;
  endDate?: Date | null;
}): Promise<string> {
  const admin = await requireAdmin();
  const cohort = await prisma.cohort.create({
    data: {
      name: params.name,
      pathwayId: params.pathwayId ?? null,
      startDate: params.startDate,
      endDate: params.endDate ?? null,
    },
  });
  await logAuditEvent({
    actor: admin,
    action: 'CREATE_COHORT',
    targetType: 'Cohort',
    targetId: cohort.id,
    metadata: { name: params.name },
  });
  revalidatePath('/admin');
  return cohort.id;
}

export async function updateCohort(
  cohortId: string,
  params: { name?: string; startDate?: Date; endDate?: Date | null },
): Promise<void> {
  const admin = await requireAdmin();
  await prisma.cohort.update({ where: { id: cohortId }, data: params });
  await logAuditEvent({
    actor: admin,
    action: 'UPDATE_COHORT',
    targetType: 'Cohort',
    targetId: cohortId,
    metadata: params,
  });
  revalidatePath('/admin');
}

export async function deleteCohort(cohortId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.cohort.delete({ where: { id: cohortId } });
  await logAuditEvent({
    actor: admin,
    action: 'DELETE_COHORT',
    targetType: 'Cohort',
    targetId: cohortId,
  });
  revalidatePath('/admin');
}

export async function addCohortDeadline(
  cohortId: string,
  label: string,
  dueDate: Date,
): Promise<void> {
  const admin = await requireAdmin();
  await prisma.cohortDeadline.create({ data: { cohortId, label, dueDate } });
  await logAuditEvent({
    actor: admin,
    action: 'ADD_COHORT_DEADLINE',
    targetType: 'Cohort',
    targetId: cohortId,
    metadata: { label, dueDate: dueDate.toISOString() },
  });
  revalidatePath('/admin');
}

/** Idempotent — adding a learner already in the cohort is a no-op rather than a duplicate-key
 * error, matching getOrCreateEnrollment's upsert convention in progress.ts. */
export async function addLearnerToCohort(cohortId: string, learnerId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.cohortMembership.upsert({
    where: { cohortId_learnerId: { cohortId, learnerId } },
    update: {},
    create: { cohortId, learnerId },
  });
  await logAuditEvent({
    actor: admin,
    action: 'ADD_COHORT_MEMBER',
    targetType: 'Cohort',
    targetId: cohortId,
    metadata: { learnerId },
  });
  revalidatePath('/admin');
  revalidatePath(`/admin/learners/${learnerId}`);
}

export async function removeLearnerFromCohort(cohortId: string, learnerId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.cohortMembership.delete({
    where: { cohortId_learnerId: { cohortId, learnerId } },
  });
  await logAuditEvent({
    actor: admin,
    action: 'REMOVE_COHORT_MEMBER',
    targetType: 'Cohort',
    targetId: cohortId,
    metadata: { learnerId },
  });
  revalidatePath('/admin');
  revalidatePath(`/admin/learners/${learnerId}`);
}
