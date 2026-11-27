import type { ReactNode } from 'react';
import { LearnerFooter } from './LearnerFooter';
import { LearnerHeader } from './LearnerHeader';
import { learnerNav } from '@/lib/nav';

export function LearnerShell({
  children,
  learnerName,
  learnerEmail,
  learnerInitial,
  wioaNavSlot,
  notificationsSlot,
}: {
  children: ReactNode;
  learnerName: string;
  learnerEmail: string;
  learnerInitial: string;
  /** Suspense-wrapped WioaNavLink from the layout — resolves independently of the rest of the
   * shell instead of making the whole header wait on its RLS-backed query. */
  wioaNavSlot?: ReactNode;
  /** Suspense-wrapped ResolvedLearnerNotifications from the layout (NOTIF-1) — same reasoning as
   * wioaNavSlot above, so the notifications query doesn't block the rest of the header either. */
  notificationsSlot?: ReactNode;
}) {
  return (
    <div className="lshell-page" data-system="learner">
      <LearnerHeader
        navItems={learnerNav}
        learnerName={learnerName}
        learnerEmail={learnerEmail}
        learnerInitial={learnerInitial}
        extraNavSlot={wioaNavSlot}
        notificationsSlot={notificationsSlot}
      />
      <main className="lshell-main">
        {children}
        <LearnerFooter nested />
      </main>
    </div>
  );
}
