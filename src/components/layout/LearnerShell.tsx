'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { LearnerHeader } from './LearnerHeader';
import { learnerNav, wioaNavItem, type NavItem } from '@/lib/nav';

export function LearnerShell({
  children,
  learnerInitial,
  showWioaNav = false,
}: {
  children: ReactNode;
  learnerInitial: string;
  showWioaNav?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems: NavItem[] = showWioaNav
    ? [...learnerNav.slice(0, 4), wioaNavItem, ...learnerNav.slice(4)]
    : learnerNav;

  return (
    <div className="min-h-screen bg-bg-page">
      <LearnerHeader
        navItems={navItems}
        learnerInitial={learnerInitial}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((open) => !open)}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}
