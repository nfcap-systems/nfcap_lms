'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems: NavItem[] = showWioaNav
    ? [...learnerNav.slice(0, 4), wioaNavItem, ...learnerNav.slice(4)]
    : learnerNav;

  return (
    <div className="lshell-page" data-system="learner">
      <LearnerHeader
        navItems={navItems}
        learnerName={learnerName}
        learnerEmail={learnerEmail}
        learnerInitial={learnerInitial}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((open) => !open)}
      />
      <main className="lshell-main">
        <div className="lshell-card">{children}</div>
      </main>
    </div>
  );
}
