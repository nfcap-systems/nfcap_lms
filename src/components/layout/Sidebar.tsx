'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { isNavGroup, isNavGroupActive, isNavItemActive, ROLE_LABEL } from '@/lib/nav';
import type { NavEntry, Role } from '@/lib/nav';
import { LogoutButton } from './LogoutButton';

function ProfileMenu({
  userName,
  userEmail,
  role,
  collapsed,
}: {
  userName: string;
  userEmail: string;
  role: Role;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initial = (userName || userEmail || '?').charAt(0).toUpperCase();
  const displayName = userName || userEmail;
  const roleLabel = ROLE_LABEL[role];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute bottom-full left-0 mb-2 w-full min-w-[12rem] overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-elevated"
        >
          <div className="px-4 py-3.5">
            <p className="truncate text-sm font-semibold text-text-primary">{displayName}</p>
            <p className="truncate text-xs text-text-muted">{roleLabel}</p>
          </div>
          <div className="border-t border-border-subtle p-1.5">
            <LogoutButton
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
            >
              <Icon name="log-out" className="h-4.5 w-4.5" />
              Sign out
            </LogoutButton>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border-default bg-bg-card px-3 py-2 text-left transition-colors hover:bg-bg-subtle',
          collapsed && 'justify-center px-2',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-sm font-semibold text-brand-primary">
          {initial}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
            <p className="truncate text-xs text-text-muted">{roleLabel}</p>
          </div>
        )}
      </button>
    </div>
  );
}

export type SidebarProps = {
  navItems: NavEntry[];
  role: Role;
  userName: string;
  userEmail: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed?: boolean;
};

const linkClasses = (active: boolean, collapsed: boolean) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    collapsed && 'justify-center px-2',
    active
      ? 'bg-bg-subtle text-brand-primary hover:bg-bg-subtle/60'
      : 'text-text-secondary hover:bg-bg-subtle/60 hover:text-text-primary',
  );

export function Sidebar({
  navItems,
  role,
  userName,
  userEmail,
  mobileOpen,
  onCloseMobile,
  collapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const renderContent = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-3">
        <div
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border border-border-default bg-bg-card px-3 py-2',
            isCollapsed && 'justify-center px-2',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger text-sm font-bold tracking-tight text-white">
            N
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.01em] text-brand-heading">
                NFCAP LMS
              </p>
              <p className="truncate text-xs text-text-muted">{ROLE_LABEL[role]}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map((entry) => {
          if (isNavGroup(entry)) {
            const groupActive = isNavGroupActive(pathname, entry);

            if (isCollapsed) {
              const firstChild = entry.children[0];
              return (
                <Link
                  key={entry.label}
                  href={firstChild.href}
                  onClick={onCloseMobile}
                  title={entry.label}
                  aria-label={entry.label}
                  className={linkClasses(groupActive, true)}
                >
                  <Icon name={entry.icon} className="h-4.5 w-4.5" />
                </Link>
              );
            }

            const expanded = openGroups[entry.label] ?? groupActive;
            return (
              <div key={entry.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [entry.label]: !expanded }))
                  }
                  className={cn(linkClasses(false, false), 'w-full justify-between')}
                  aria-expanded={expanded}
                >
                  <span className="flex items-center gap-3">
                    <Icon name={entry.icon} className="h-4.5 w-4.5" />
                    {entry.label}
                  </span>
                  <Icon
                    name="chevron-right"
                    className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
                  />
                </button>
                {expanded && (
                  <div className="mt-0.5 space-y-0.5 pl-4">
                    {entry.children.map((child) => {
                      const active = isNavItemActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onCloseMobile}
                          className={linkClasses(active, false)}
                          aria-current={active ? 'page' : undefined}
                        >
                          <Icon name={child.icon} className="h-4.5 w-4.5" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isNavItemActive(pathname, entry.href);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={onCloseMobile}
              title={isCollapsed ? entry.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={linkClasses(active, isCollapsed)}
            >
              <Icon name={entry.icon} className="h-4.5 w-4.5" />
              {!isCollapsed && entry.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 p-3">
        <ProfileMenu userName={userName} userEmail={userEmail} role={role} collapsed={isCollapsed} />
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          'hidden h-full shrink-0 transition-[width] duration-200 lg:block',
          collapsed ? 'w-20' : 'w-52',
        )}
      >
        {renderContent(collapsed)}
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
            'absolute left-0 top-0 h-full w-52 bg-bg-card shadow-elevated transition-transform',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {renderContent(false)}
        </aside>
      </div>
    </>
  );
}
