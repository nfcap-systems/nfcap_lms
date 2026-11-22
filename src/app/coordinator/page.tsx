import { connection } from 'next/server';
import { getWioaCases } from '@/lib/data/wioa';
import { getPartnerStaffRoster } from '@/lib/data/learners';
import { requireCoordinator } from '@/lib/actions/guard';
import { WioaCaseListView } from '@/components/wioa/WioaCaseListView';

export default async function CoordinatorPage() {
  // getPartnerStaffRoster comes from Supabase Auth directly (src/lib/data/learners.ts), which has
  // no revalidatePath hook on signup — see src/app/admin/page.tsx.
  await connection();
  const coordinator = await requireCoordinator();
  const [cases, partnerStaffRoster] = await Promise.all([
    getWioaCases({ userId: coordinator.id, role: 'WIOA_COORDINATOR' }),
    getPartnerStaffRoster(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>All Cases</h1>
          <p>
            Every WIOA funding case across every workforce board — full case detail and
            funding-request visibility. Assign cases to Partner Staff, review documents, and
            advance status.
          </p>
        </div>
      </div>

      <WioaCaseListView
        cases={cases}
        basePath="/coordinator"
        partnerStaffRoster={partnerStaffRoster}
      />
    </div>
  );
}
