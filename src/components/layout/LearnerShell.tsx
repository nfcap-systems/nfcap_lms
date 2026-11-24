import type { ReactNode } from 'react';
import { LearnerFooter } from './LearnerFooter';
import { LearnerHeader } from './LearnerHeader';
import { learnerNav, wioaNavItem, type NavItem } from '@/lib/nav';

export function LearnerShell({
  children,
  learnerName,
  learnerEmail,
  learnerInitial,
  showWioaNav = false,
}: {
  children: ReactNode;
  learnerName: string;
  learnerEmail: string;
  learnerInitial: string;
  showWioaNav?: boolean;
}) {
  const navItems: NavItem[] = showWioaNav ? [...learnerNav, wioaNavItem] : learnerNav;

  return (
    <div className="lshell-page" data-system="learner">
      <LearnerHeader
        navItems={navItems}
        learnerName={learnerName}
        learnerEmail={learnerEmail}
        learnerInitial={learnerInitial}
      />
      <main className="lshell-main">
        {children}
        <LearnerFooter nested />
      </main>
    </div>
  );
}
