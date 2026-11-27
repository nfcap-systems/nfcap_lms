import { Suspense } from 'react';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { WioaNavLink } from '@/components/layout/WioaNavLink';
import { ResolvedLearnerNotifications } from '@/components/layout/ResolvedLearnerNotifications';
import { getAuthUser, getRole } from '@/lib/supabase/server';

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  // Only getAuthUser() blocks the shell now — it's a fast cookie-backed session read. The
  // Funding nav item's own data (WioaNavLink) used to be awaited right here via getLearnerProfile,
  // which blocked the ENTIRE header (not just that one link) behind an RLS transaction on every
  // learner page load. Suspense below lets the rest of the shell paint immediately instead.
  const user = await getAuthUser();
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;
  const learnerName = name ?? user?.email ?? 'Learner';
  const learnerEmail = user?.email ?? '';
  const learnerInitial = learnerName.charAt(0).toUpperCase();

  return (
    <LearnerShell
      learnerName={learnerName}
      learnerEmail={learnerEmail}
      learnerInitial={learnerInitial}
      wioaNavSlot={
        user && (
          <Suspense fallback={null}>
            <WioaNavLink userId={user.id} role={getRole(user) ?? 'LEARNER'} />
          </Suspense>
        )
      }
      notificationsSlot={
        user && (
          <Suspense fallback={null}>
            <ResolvedLearnerNotifications userId={user.id} />
          </Suspense>
        )
      }
    >
      {children}
    </LearnerShell>
  );
}
