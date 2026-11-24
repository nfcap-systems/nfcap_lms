import { connection } from 'next/server';
import { requireCoordinator } from '@/lib/actions/guard';
import { getStalledCases, getWioaCases } from '@/lib/data/wioa';
import { StalledCasesView } from '@/components/wioa/StalledCasesView';

export default async function CoordinatorStalledCasesPage() {
  await connection();
  const coordinator = await requireCoordinator();
  const viewer = { userId: coordinator.id, role: 'WIOA_COORDINATOR' as const };
  const [stalled, allCases] = await Promise.all([getStalledCases(viewer), getWioaCases(viewer)]);

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Stalled Cases</h1>
          <p>
            Cases with no status change in 14+ days — the trigger threshold for
            Feature_Detail_Client.md&apos;s Stalled-Case Detection feature. Coordinator oversight
            view; trainee follow-up is Partner Staff&apos;s action, on their own board.
          </p>
        </div>
      </div>
      <StalledCasesView cases={stalled} totalCaseCount={allCases.length} />
    </div>
  );
}
