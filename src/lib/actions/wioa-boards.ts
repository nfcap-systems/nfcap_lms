'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from './guard';
import type {
  WorkforceBoardFields,
  AjccCenterFields,
  WorkforceJurisdictionFields,
  WorkforceContactFields,
} from '@/lib/data/wioa-boards';

// Admin-only CRUD over the reference data ZIP-matching depends on (WIOA_INTEGRATION_PLAN.md
// Section 5, docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — "no-code-change routing"). Records are never
// hard-deleted: every model already carries an `active` flag (same pattern as
// Course.isPublished), and cases/jurisdictions/contacts reference these rows by id — deactivating
// keeps history and existing WioaCase links intact instead of risking an FK violation.

export async function createWorkforceBoard(fields: WorkforceBoardFields): Promise<{ id: string }> {
  await requireAdmin();
  const board = await prisma.workforceBoard.create({ data: fields });
  revalidatePath('/admin/wioa/boards');
  return { id: board.id };
}

export async function updateWorkforceBoard(
  boardId: string,
  fields: WorkforceBoardFields,
): Promise<void> {
  await requireAdmin();
  await prisma.workforceBoard.update({ where: { id: boardId }, data: fields });
  revalidatePath('/admin/wioa/boards');
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function setWorkforceBoardActive(boardId: string, active: boolean): Promise<void> {
  await requireAdmin();
  await prisma.workforceBoard.update({ where: { id: boardId }, data: { active } });
  revalidatePath('/admin/wioa/boards');
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function createAjccCenter(
  boardId: string,
  fields: AjccCenterFields,
): Promise<void> {
  await requireAdmin();
  await prisma.ajccCenter.create({ data: { workforceBoardId: boardId, ...fields } });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function updateAjccCenter(
  boardId: string,
  ajccId: string,
  fields: AjccCenterFields,
): Promise<void> {
  await requireAdmin();
  await prisma.ajccCenter.update({ where: { id: ajccId }, data: fields });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function setAjccCenterActive(
  boardId: string,
  ajccId: string,
  active: boolean,
): Promise<void> {
  await requireAdmin();
  await prisma.ajccCenter.update({ where: { id: ajccId }, data: { active } });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function createWorkforceJurisdiction(
  boardId: string,
  fields: WorkforceJurisdictionFields,
): Promise<void> {
  await requireAdmin();
  await prisma.workforceJurisdiction.create({
    data: { workforceBoardId: boardId, ...fields },
  });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function updateWorkforceJurisdiction(
  boardId: string,
  jurisdictionId: string,
  fields: WorkforceJurisdictionFields,
): Promise<void> {
  await requireAdmin();
  await prisma.workforceJurisdiction.update({ where: { id: jurisdictionId }, data: fields });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function setWorkforceJurisdictionActive(
  boardId: string,
  jurisdictionId: string,
  active: boolean,
): Promise<void> {
  await requireAdmin();
  await prisma.workforceJurisdiction.update({ where: { id: jurisdictionId }, data: { active } });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function createWorkforceContact(
  boardId: string,
  fields: WorkforceContactFields,
): Promise<void> {
  await requireAdmin();
  await prisma.workforceContact.create({ data: { workforceBoardId: boardId, ...fields } });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function updateWorkforceContact(
  boardId: string,
  contactId: string,
  fields: WorkforceContactFields,
): Promise<void> {
  await requireAdmin();
  await prisma.workforceContact.update({ where: { id: contactId }, data: fields });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}

export async function setWorkforceContactActive(
  boardId: string,
  contactId: string,
  active: boolean,
): Promise<void> {
  await requireAdmin();
  await prisma.workforceContact.update({ where: { id: contactId }, data: { active } });
  revalidatePath(`/admin/wioa/boards/${boardId}`);
}
