import { requireCoordinator } from '@/lib/actions/guard';
import { getWioaReportingSummary } from '@/lib/data/wioa';
import { WioaReportsView } from '@/components/wioa/WioaReportsView';

export const dynamic = 'force-dynamic';

export default async function CoordinatorReportsPage() {
  await requireCoordinator();
  const summary = await getWioaReportingSummary({ includeFunding: true });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pipeline, document readiness, board performance, and follow-up queue across every WIOA
          case.
        </p>
      </div>

      <WioaReportsView summary={summary} basePath="/coordinator" />
    </div>
  );
}
