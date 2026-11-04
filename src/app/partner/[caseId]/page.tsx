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
  const wioaCase = await getWioaCaseDetail(caseId);
  // Partner Staff only ever sees their own assigned cases — a case ID typed/pasted for someone
  // else's case renders as not-found rather than leaking whether it exists.
  if (!wioaCase || wioaCase.assignedPartnerStaffId !== user.id) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">WIOA Case</p>
        <h1 className="text-xl font-semibold text-brand-heading">{wioaCase.learnerName}</h1>
        <p className="text-sm text-text-secondary">
          {wioaCase.courseTitle} · {wioaCase.learnerEmail}
        </p>
      </div>
      <WioaCaseDetailView wioaCase={wioaCase} />
    </div>
  );
}
