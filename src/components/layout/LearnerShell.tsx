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
}: {
  children: ReactNode;
  learnerName: string;
  learnerEmail: string;
  learnerInitial: string;
  /** Suspense-wrapped WioaNavLink from the layout — resolves independently of the rest of the
   * shell instead of making the whole header wait on its RLS-backed query. */
  wioaNavSlot?: ReactNode;
}) {
  return (
    <div className="lshell-page" data-system="learner">
      <LearnerHeader
        navItems={learnerNav}
        learnerName={learnerName}
        learnerEmail={learnerEmail}
        learnerInitial={learnerInitial}
        extraNavSlot={wioaNavSlot}
      />
      <main className="lshell-main">
        {children}
        <LearnerFooter nested />
      </main>
    </div>
  );
}
