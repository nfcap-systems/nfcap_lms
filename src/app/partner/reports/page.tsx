import { requirePartnerStaff } from '@/lib/actions/guard';
import { getWioaReportingSummary } from '@/lib/data/wioa';
import { WioaReportsView } from '@/components/wioa/WioaReportsView';

export default async function PartnerReportsPage() {
  const user = await requirePartnerStaff();
  const summary = await getWioaReportingSummary({ assignedPartnerStaffId: user.id });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pipeline, document readiness, and follow-up queue across your assigned cases.
        </p>
      </div>

      <WioaReportsView summary={summary} basePath="/partner" />
    </div>
  );
}
