import { getWorkforceBoards } from '@/lib/data/wioa-boards';
import { BoardsAdminView } from './BoardsAdminView';

export const dynamic = 'force-dynamic';

export default async function AdminWioaBoardsPage() {
  const boards = await getWorkforceBoards();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">WIOA Boards</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Workforce boards, AJCC centers, ZIP jurisdictions, and contacts the matching engine
          routes learners to. Open a board to manage its centers/ZIPs/contacts.
        </p>
      </div>

      <BoardsAdminView boards={boards} />
    </div>
  );
}
