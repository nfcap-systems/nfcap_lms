import { notFound } from 'next/navigation';
import { requirePartnerStaff } from '@/lib/actions/guard';
import { getWioaCaseDetail } from '@/lib/data/wioa';
import { WioaCaseDetailView } from '@/components/wioa/WioaCaseDetailView';

export default async function PartnerCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const user = await requirePartnerStaff();
  const { caseId } = await params;
  const wioaCase = await getWioaCaseDetail({ userId: user.id, role: 'PARTNER_STAFF' }, caseId);
  // Partner Staff only ever sees their own assigned cases — a case ID typed/pasted for someone
  // else's case renders as not-found rather than leaking whether it exists.
  if (!wioaCase || wioaCase.assignedPartnerStaffId !== user.id) notFound();

  return <WioaCaseDetailView wioaCase={wioaCase} basePath="/partner" />;
}
