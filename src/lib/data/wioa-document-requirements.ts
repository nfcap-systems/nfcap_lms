import { prisma } from '@/lib/prisma';

export type WioaDocumentRequirementAdminRecord = {
  id: string;
  workforceBoardId: string;
  boardName: string;
  name: string;
  description: string;
  conditional: boolean;
  applicableRule: string | null;
};

/** Every requirement across every board, for the admin CRUD list (docs/build/WIOA_BUILD_WORKFLOW.md
 * Phase 3 — replaces prisma/seed-wioa.ts's hardcoded seed as the source of truth going forward;
 * the seed script still runs once to bootstrap a fresh DB). */
export async function getAllWioaDocumentRequirements(): Promise<
  WioaDocumentRequirementAdminRecord[]
> {
  const requirements = await prisma.wioaDocumentRequirement.findMany({
    orderBy: [{ workforceBoard: { name: 'asc' } }, { name: 'asc' }],
    include: { workforceBoard: { select: { name: true } } },
  });

  return requirements.map((r) => ({
    id: r.id,
    workforceBoardId: r.workforceBoardId,
    boardName: r.workforceBoard.name,
    name: r.name,
    description: r.description,
    conditional: r.conditional,
    applicableRule: r.applicableRule,
  }));
}
