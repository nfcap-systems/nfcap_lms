import { getAllWioaDocumentRequirements } from '@/lib/data/wioa-document-requirements';
import { getWorkforceBoards } from '@/lib/data/wioa-boards';
import { DocumentRequirementsAdminView } from './DocumentRequirementsAdminView';

export const dynamic = 'force-dynamic';

export default async function AdminWioaDocumentRequirementsPage() {
  const [requirements, boards] = await Promise.all([
    getAllWioaDocumentRequirements(),
    getWorkforceBoards(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">WIOA Documents</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Document requirements a case&apos;s checklist is built from, scoped per workforce board.
          Editing here replaces prisma/seed-wioa.ts&apos;s hardcoded set as the source of truth.
        </p>
      </div>

      <DocumentRequirementsAdminView requirements={requirements} boards={boards} />
    </div>
  );
}
