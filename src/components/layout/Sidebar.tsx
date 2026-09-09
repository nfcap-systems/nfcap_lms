'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { isNavItemActive, ROLE_LABEL } from '@/lib/nav';
import type { NavItem, Role } from '@/lib/nav';

export type SidebarProps = {
  navItems: NavItem[];
  role: Role;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

// Admin and Learner can flip between their two dashboards for a quick look (both existed before
// the WIOA roles). Partner Staff/WIOA Coordinator have no such counterpart — proxy.ts confines
// every role to exactly one prefix, so there's no "other" dashboard to offer them.
const SWITCHABLE_ROLE: Partial<Record<Role, Role>> = { learner: 'admin', admin: 'learner' };

export function Sidebar({ navItems, role, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const otherRole = SWITCHABLE_ROLE[role];

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-sm font-bold tracking-tight text-on-brand">
          N
        </div>
        <div>
          <p className="text-sm font-semibold tracking-[-0.01em] text-brand-heading">NFCAP LMS</p>
          <p className="text-xs text-text-muted">{ROLE_LABEL[role]}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-primary text-on-brand'
                  : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {otherRole && (
        <div className="border-t border-border-subtle p-3">
          <Link
            href={otherRole === 'admin' ? '/admin' : '/learner'}
            className="flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-text-muted hover:bg-bg-subtle hover:text-text-primary"
          >
            Switch to {ROLE_LABEL[otherRole]} view
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-border-subtle bg-bg-card lg:block">
        {content}
      </aside>

      <div
        className={cn('fixed inset-0 z-40 lg:hidden', mobileOpen ? '' : 'pointer-events-none')}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onCloseMobile}
          className={cn(
            'absolute inset-0 bg-slate-900/40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'absolute left-0 top-0 h-full w-64 bg-bg-card shadow-elevated transition-transform',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {content}
        </aside>
      </div>
    </>
  );
}
