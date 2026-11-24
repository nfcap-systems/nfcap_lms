'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { isNavItemActive } from '@/lib/nav';
import type { NavItem } from '@/lib/nav';
import { GlobalSearch } from './GlobalSearch';
import { LogoutButton } from './LogoutButton';
import { NotificationsMenu } from './NotificationsMenu';

export type LearnerHeaderProps = {
  navItems: NavItem[];
  learnerName: string;
  learnerEmail: string;
  learnerInitial: string;
  mobileOpen: boolean;
  onToggleMobile: () => void;
};

// Ported literally from the design canvas's LearnerHeader.dc.html, which every learner board
// (including LRN01-Home) imports as a shared nested component — a two-row sticky header, not
// the single-row floating-card bar this used to be. See docs/build/LRN_BATCH_DRIFT.md.
export function LearnerHeader({
  navItems,
  learnerName,
  learnerEmail,
  learnerInitial,
  mobileOpen,
  onToggleMobile,
}: LearnerHeaderProps) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setAccountOpen(false);
  }

  const openAccountMenu = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setAccountOpen(true);
  };
  const scheduleCloseAccountMenu = () => {
    closeTimeout.current = setTimeout(() => setAccountOpen(false), 150);
  };

  useEffect(
    () => () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    },
    [],
  );

  useEffect(() => {
    if (!accountOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountOpen]);

  return (
    <header className="lhdr">
      {/* Row 1 — brand, Ask AI, search, utility icons, persistent account */}
      <div className="lhdr-row1">
        <Link href="/learner" className="lhdr-logo">
          <span className="lhdr-brand-mark">
            <Icon name="shield" className="h-4 w-4" />
          </span>
          <span className="lhdr-brand-word">NFCAP</span>
        </Link>

        <button type="button" disabled className="lhdr-askai">
          <Icon name="sparkles" className="h-3.5 w-3.5" />
          Ask AI
          <span className="lhdr-askai-badge">Soon</span>
        </button>
        <div className="lhdr-vdivider" />

        <GlobalSearch variant="pill" />

        <div className="lhdr-spacer" />

        <div className="lhdr-utility">
          {/* Inert pending a real Inbox UI — Messaging's backend/RLS exists (Layer 1), no route yet. */}
          <button type="button" aria-label="Messages" disabled className="lhdr-iconbtn2">
            <Icon name="message-circle" className="h-4.5 w-4.5" />
          </button>
          <NotificationsMenu variant="plain" />
          <div className="lhdr-vdivider" />

          <div
            className="relative"
            ref={accountRef}
            onMouseEnter={openAccountMenu}
            onMouseLeave={scheduleCloseAccountMenu}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setAccountOpen(false);
              }
            }}
          >
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              onFocus={openAccountMenu}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label="Account menu"
              className="lhdr-account"
            >
              <span className="lhdr-avatar">{learnerInitial}</span>
              <span className="lhdr-account-text">
                <span className="lhdr-account-name block">{learnerName}</span>
                <span className="lhdr-account-role block">Learner</span>
              </span>
              <Icon
                name="chevron-down"
                className="h-3.5 w-3.5"
                style={{ color: 'var(--ink-muted)' }}
              />
            </button>

            {accountOpen && (
              <div role="menu" aria-label="Account" className="lhdr-menu">
                <div className="lhdr-menu-head">
                  <div className="lhdr-avatar" style={{ cursor: 'default' }}>
                    {learnerInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {learnerName}
                    </p>
                    <p className="truncate text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {learnerEmail}
                    </p>
                  </div>
                </div>
                <div className="lhdr-menu-group">
                  <Link
                    href="/learner/profile"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="lhdr-menuitem"
                  >
                    <Icon name="user" className="h-4.5 w-4.5" />
                    Profile
                  </Link>
                  <Link
                    href="/learner/account"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="lhdr-menuitem"
                  >
                    <Icon name="settings" className="h-4.5 w-4.5" />
                    Account Settings
                  </Link>
                </div>
                <div className="lhdr-menu-group">
                  <LogoutButton role="menuitem" className="lhdr-menuitem">
                    <Icon name="log-out" className="h-4.5 w-4.5" />
                    Log out
                  </LogoutButton>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleMobile}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            className="lhdr-iconbtn lg:hidden"
          >
            <Icon name={mobileOpen ? 'x' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Row 2 — nav strip, underline-active, scrolls horizontally rather than wrapping */}
      <nav className="hidden lhdr-row2 lg:flex">
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn('toplink', active && 'on')}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {mobileOpen && (
        <nav className="lhdr-mobilenav lg:hidden">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onToggleMobile}
                    aria-current={active ? 'page' : undefined}
                    className={cn('lhdr-mobile-navlink', active && 'on')}
                  >
                    <Icon name={item.icon} className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li
              className="mt-1"
              style={{ borderTop: '1px solid var(--nfcap-border)', paddingTop: 8 }}
            >
              <LogoutButton className="lhdr-mobile-navlink w-full" />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
