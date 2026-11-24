import { notFound } from 'next/navigation';
import { getWorkforceBoardDetail, getActiveCasesForBoard } from '@/lib/data/wioa-boards';
import { getLearnerRoster } from '@/lib/data/learners';
import { BoardDetailView } from './BoardDetailView';

export default async function AdminWioaBoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const board = await getWorkforceBoardDetail(boardId);
  if (!board) notFound();

  const [cases, learners] = await Promise.all([
    getActiveCasesForBoard(boardId),
    getLearnerRoster(),
  ]);
  const learnerNameById = new Map(learners.map((l) => [l.id, l.name]));
  const activeCases = cases.map((c) => ({
    id: c.id,
    learnerName: learnerNameById.get(c.learnerId) ?? 'Unknown learner',
    status: c.status,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          WIOA Board
        </p>
        <h1 className="text-xl font-semibold text-foreground">{board.name}</h1>
        <p className="text-sm text-muted-foreground">{board.serviceArea}</p>
      </div>
      <BoardDetailView board={board} activeCases={activeCases} />
    </div>
  );
}
