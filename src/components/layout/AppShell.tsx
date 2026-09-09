'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { getActiveNavLabel, ROLE_LABEL } from '@/lib/nav';
import type { NavItem, Role } from '@/lib/nav';

export type AppShellProps = {
  role: Role;
  navItems: NavItem[];
  children: ReactNode;
};

export function AppShell({ role, navItems, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const title = getActiveNavLabel(pathname, navItems, ROLE_LABEL[role]);

  return (
    <div className="flex min-h-screen bg-bg-page">
      <Sidebar
        navItems={navItems}
        role={role}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header title={title} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
