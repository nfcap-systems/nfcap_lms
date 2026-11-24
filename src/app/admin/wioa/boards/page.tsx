import { getWorkforceBoards } from '@/lib/data/wioa-boards';
import { BoardsAdminView } from './BoardsAdminView';

export default async function AdminWioaBoardsPage() {
  const boards = await getWorkforceBoards();
  return <BoardsAdminView boards={boards} />;
}
