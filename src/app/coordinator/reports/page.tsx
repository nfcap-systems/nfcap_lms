import { requireCoordinator } from '@/lib/actions/guard';
import { getWioaReportingSummary } from '@/lib/data/wioa';
import { WioaReportsView } from '@/components/wioa/WioaReportsView';

export default async function CoordinatorReportsPage() {
  const coordinator = await requireCoordinator();
  const summary = await getWioaReportingSummary(
    { userId: coordinator.id, role: 'WIOA_COORDINATOR' },
    { includeFunding: true },
  );

  return <WioaReportsView summary={summary} basePath="/coordinator" />;
}
