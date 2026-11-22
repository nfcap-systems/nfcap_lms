import { requirePartnerStaff } from '@/lib/actions/guard';
import { getWioaCases } from '@/lib/data/wioa';
import { WioaCaseListView } from '@/components/wioa/WioaCaseListView';

export default async function PartnerPage() {
  const user = await requirePartnerStaff();
  const cases = await getWioaCases(
    { userId: user.id, role: 'PARTNER_STAFF' },
    { assignedPartnerStaffId: user.id },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>My Cases</h1>
          <p>WIOA cases assigned to you. Review documents, record follow-up, and advance status.</p>
        </div>
      </div>

      <WioaCaseListView cases={cases} basePath="/partner" />
    </div>
  );
}
