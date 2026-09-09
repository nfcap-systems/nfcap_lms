'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from './guard';

export type WioaDocumentRequirementFields = {
  workforceBoardId: string;
  name: string;
  description: string;
  conditional: boolean;
  applicableRule: string | null;
};

/** Admin CRUD replacing prisma/seed-wioa.ts's hardcoded requirement set
 * (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3). Note: the "conditional" flag only actually gates
 * checklist generation for the one rule src/lib/actions/wioa.ts hardcodes by name (the EDD Award
 * Letter, see src/lib/wioa/documents.ts) — a custom conditional requirement with a different name
 * always generates on case creation, same as a non-conditional one. Editing that document comment
 * happens if this prototype ever needs a real rule engine; out of scope here. */
export async function createWioaDocumentRequirement(
  fields: WioaDocumentRequirementFields,
): Promise<void> {
  await requireAdmin();
  await prisma.wioaDocumentRequirement.create({ data: fields });
  revalidatePath('/admin/wioa/document-requirements');
}

export async function updateWioaDocumentRequirement(
  requirementId: string,
  fields: WioaDocumentRequirementFields,
): Promise<void> {
  await requireAdmin();
  await prisma.wioaDocumentRequirement.update({ where: { id: requirementId }, data: fields });
  revalidatePath('/admin/wioa/document-requirements');
}

/** No hard delete — a requirement may already have WioaDocument rows on open cases
 * (WioaDocumentRequirement.documents, onDelete not cascading from this side). Board CRUD's
 * active-flag pattern doesn't apply here (the schema has none), so removal is out of scope for
 * this prototype; edit the name/description instead if a requirement changes. */
