import { notFound } from 'next/navigation';
import { getWorkforceBoardDetail } from '@/lib/data/wioa-boards';
import { BoardDetailView } from './BoardDetailView';

export default async function AdminWioaBoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const board = await getWorkforceBoardDetail(boardId);
  if (!board) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">WIOA Board</p>
        <h1 className="text-xl font-semibold text-brand-heading">{board.name}</h1>
        <p className="text-sm text-text-secondary">{board.serviceArea}</p>
      </div>
      <BoardDetailView board={board} />
    </div>
  );
}
