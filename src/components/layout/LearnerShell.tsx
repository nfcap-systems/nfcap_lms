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
    <div className="min-h-screen">
      <LearnerHeader
        navItems={navItems}
        learnerName={learnerName}
        learnerEmail={learnerEmail}
        learnerInitial={learnerInitial}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((open) => !open)}
      />
      <main className="mx-auto max-w-screen-2xl px-[50px] pt-2 pb-6 sm:pt-3 sm:pb-8">
        <div className="learner-surface rounded-2xl border border-border-subtle p-4 shadow-card sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
