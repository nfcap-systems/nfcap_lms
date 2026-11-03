import { requirePartnerStaff } from '@/lib/actions/guard';
import { getWioaCases } from '@/lib/data/wioa';
import { WioaCaseListView } from '@/components/wioa/WioaCaseListView';

export default async function PartnerPage() {
  const user = await requirePartnerStaff();
  const cases = await getWioaCases({ assignedPartnerStaffId: user.id });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">My Cases</h1>
        <p className="mt-1 text-sm text-text-secondary">
          WIOA cases assigned to you. Review documents, record follow-up, and advance status.
        </p>
      </div>

      <WioaCaseListView cases={cases} basePath="/partner" />
    </div>
  );
}
