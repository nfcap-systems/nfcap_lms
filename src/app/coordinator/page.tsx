import { getWioaCases } from '@/lib/data/wioa';
import { getPartnerStaffRoster } from '@/lib/data/learners';
import { WioaCaseListView } from '@/components/wioa/WioaCaseListView';

export const dynamic = 'force-dynamic';

export default async function CoordinatorPage() {
  const [cases, partnerStaffRoster] = await Promise.all([
    getWioaCases(),
    getPartnerStaffRoster(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-heading">WIOA Cases</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Every open and closed WIOA funding case across every workforce board. Assign cases to
          Partner Staff, review documents, and advance status.
        </p>
      </div>

      <WioaCaseListView cases={cases} basePath="/coordinator" partnerStaffRoster={partnerStaffRoster} />
    </div>
  );
}
