import { getAllWioaDocumentRequirements } from '@/lib/data/wioa-document-requirements';
import { getWorkforceBoards } from '@/lib/data/wioa-boards';
import { DocumentRequirementsAdminView } from './DocumentRequirementsAdminView';

export default async function AdminWioaDocumentRequirementsPage() {
  const [requirements, boards] = await Promise.all([
    getAllWioaDocumentRequirements(),
    getWorkforceBoards(),
  ]);
  return <DocumentRequirementsAdminView requirements={requirements} boards={boards} />;
}
