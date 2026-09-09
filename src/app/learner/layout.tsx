import { LearnerShell } from '@/components/layout/LearnerShell';
import { getAuthUser } from '@/lib/supabase/server';
import { getLearnerProfile } from '@/lib/data/wioa';

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;
  const learnerInitial = (name ?? user?.email ?? 'N').charAt(0).toUpperCase();
  const profile = user ? await getLearnerProfile(user.id) : null;

  return (
    <LearnerShell
      learnerInitial={learnerInitial}
      showWioaNav={profile?.fundingSource === 'WIOA_PENDING'}
    >
      {children}
    </LearnerShell>
  );
}
