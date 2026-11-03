import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getWioaCaseDetail } from '@/lib/data/wioa';
import { getPartnerStaffRoster } from '@/lib/data/learners';
import { WioaCaseDetailView } from '@/components/wioa/WioaCaseDetailView';

export default async function CoordinatorCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  // getPartnerStaffRoster comes from Supabase Auth directly (src/lib/data/learners.ts), which has
  // no revalidatePath hook on signup — see src/app/admin/page.tsx.
  await connection();
  const { caseId } = await params;
  const [wioaCase, partnerStaffRoster] = await Promise.all([
    getWioaCaseDetail(caseId, { includeFunding: true }),
    getPartnerStaffRoster(),
  ]);
  if (!wioaCase) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">WIOA Case</p>
        <h1 className="text-xl font-semibold text-brand-heading">{wioaCase.learnerName}</h1>
        <p className="text-sm text-text-secondary">
          {wioaCase.courseTitle} · {wioaCase.learnerEmail}
        </p>
      </div>
      <WioaCaseDetailView wioaCase={wioaCase} partnerStaffRoster={partnerStaffRoster} />
    </div>
  );
}
