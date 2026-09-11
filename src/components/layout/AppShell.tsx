'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { getActiveNavLabel, ROLE_LABEL } from '@/lib/nav';
import type { NavEntry, Role } from '@/lib/nav';

export type AppShellProps = {
  role: Role;
  navItems: NavEntry[];
  userName: string;
  userEmail: string;
  children: ReactNode;
};

const DASHBOARD_ROOT: Record<Role, string> = {
  admin: '/admin',
  coordinator: '/coordinator',
  partner: '/partner',
  learner: '/learner',
};

const SIDEBAR_COLLAPSED_KEY = 'nfcap-sidebar-collapsed';

export function AppShell({ role, navItems, userName, userEmail, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === '1') setSidebarCollapsed(true);
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const isDashboardRoot = pathname === DASHBOARD_ROOT[role];
  const firstName = userName.trim().split(' ')[0];

  const title =
    isDashboardRoot && role === 'admin'
      ? `Welcome, ${firstName || 'there'} 👋`
      : getActiveNavLabel(pathname, navItems, ROLE_LABEL[role]);
  const subtitle =
    isDashboardRoot && role === 'admin' ? "Here's what happened with your learning system" : undefined;

  return (
    <div className="flex h-screen gap-3 overflow-hidden bg-bg-page p-3">
      <Sidebar
        navItems={navItems}
        role={role}
        userName={userName}
        userEmail={userEmail}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        collapsed={sidebarCollapsed}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-0.5">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapsed={toggleSidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto rounded-b-2xl bg-bg-card p-4 shadow-card sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
