import { requirePartnerStaff } from '@/lib/actions/guard';
import { getWioaReportingSummary } from '@/lib/data/wioa';
import { WioaReportsView } from '@/components/wioa/WioaReportsView';

export default async function PartnerReportsPage() {
  const user = await requirePartnerStaff();
  const summary = await getWioaReportingSummary(
    { userId: user.id, role: 'PARTNER_STAFF' },
    { assignedPartnerStaffId: user.id },
  );

  return <WioaReportsView summary={summary} basePath="/partner" />;
}
