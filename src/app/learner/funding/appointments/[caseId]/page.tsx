import { notFound } from 'next/navigation';
import { AppointmentsView } from '@/components/learner/AppointmentsView';
import { getWioaCasesForLearner } from '@/lib/data/wioa';
import { getAuthUser, getRole } from '@/lib/supabase/server';

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const user = await getAuthUser();
  if (!user) notFound();
  const viewer = { userId: user.id, role: getRole(user) ?? 'LEARNER' };

  const cases = await getWioaCasesForLearner(viewer, user.id);
  const wioaCase = cases.find((c) => c.id === caseId);
  if (!wioaCase) notFound();

  return (
    <AppointmentsView courseTitle={wioaCase.courseTitle} appointments={wioaCase.appointments} />
  );
}
