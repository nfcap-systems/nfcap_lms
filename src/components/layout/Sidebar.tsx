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
        <div role="menu" aria-label="Account" className="sshell-profile-menu">
          <div style={{ padding: '14px 16px' }}>
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {displayName}
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--ink-muted)' }}>
              {roleLabel}
            </p>
          </div>
          <div style={{ borderTop: '1px solid var(--nfcap-border)', padding: 6 }}>
            <Link
              href={`/${role}/account`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="lhdr-menuitem"
            >
              <Icon name="settings" className="h-4.5 w-4.5" />
              Account Settings
            </Link>
          </div>
          <div style={{ borderTop: '1px solid var(--nfcap-border)', padding: 6 }}>
            <LogoutButton role="menuitem" className="lhdr-menuitem">
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
        className={cn('sshell-profile-btn', collapsed && 'justify-center px-2')}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}
        >
          {initial}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {displayName}
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--ink-muted)' }}>
              {roleLabel}
            </p>
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
      <div className="sshell-brand">
        <div className="sshell-brand-mark">N</div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--nfcap-sidebar-fg)' }}
            >
              NFCAP LMS
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--ink-muted)' }}>
              {ROLE_LABEL[role]}
            </p>
          </div>
        )}
      </div>

      <nav className="sshell-nav">
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
                  className={cn('sshell-navlink', groupActive && 'on', 'justify-center')}
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
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [entry.label]: !expanded }))}
                  className="sshell-navgroup-btn"
                  aria-expanded={expanded}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name={entry.icon} className="h-4.5 w-4.5" />
                    {entry.label}
                  </span>
                  <Icon
                    name="chevron-right"
                    className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
                  />
                </button>
                {expanded && (
                  <div className="mt-0.5 flex flex-col gap-0.5 pl-4">
                    {entry.children.map((child) => {
                      const active = isNavItemActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onCloseMobile}
                          className={cn('sshell-navlink', active && 'on')}
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
              className={cn('sshell-navlink', active && 'on', isCollapsed && 'justify-center')}
            >
              <Icon name={entry.icon} className="h-4.5 w-4.5" />
              {!isCollapsed && entry.label}
            </Link>
          );
        })}
      </nav>

      <div className="sshell-profile-wrap">
        <ProfileMenu
          userName={userName}
          userEmail={userEmail}
          role={role}
          collapsed={isCollapsed}
        />
      </div>
    </div>
  );

  return (
    <>
      <aside className={cn('sshell-sidebar hidden lg:block', collapsed ? 'w-20' : 'w-52')}>
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
            'sshell-sidebar absolute left-0 top-0 h-full w-52 transition-transform',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {renderContent(false)}
        </aside>
      </div>
    </>
  );
}
