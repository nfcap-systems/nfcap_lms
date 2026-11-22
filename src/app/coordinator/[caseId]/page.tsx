import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getWioaCaseDetail } from '@/lib/data/wioa';
import { getPartnerStaffRoster } from '@/lib/data/learners';
import { requireCoordinator } from '@/lib/actions/guard';
import { WioaCaseDetailView } from '@/components/wioa/WioaCaseDetailView';

export default async function CoordinatorCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  // getPartnerStaffRoster comes from Supabase Auth directly (src/lib/data/learners.ts), which has
  // no revalidatePath hook on signup — see src/app/admin/page.tsx.
  await connection();
  const coordinator = await requireCoordinator();
  const { caseId } = await params;
  const [wioaCase, partnerStaffRoster] = await Promise.all([
    getWioaCaseDetail({ userId: coordinator.id, role: 'WIOA_COORDINATOR' }, caseId, {
      includeFunding: true,
    }),
    getPartnerStaffRoster(),
  ]);
  if (!wioaCase) notFound();

  return (
    <WioaCaseDetailView wioaCase={wioaCase} basePath="/coordinator" partnerStaffRoster={partnerStaffRoster} />
  );
}
