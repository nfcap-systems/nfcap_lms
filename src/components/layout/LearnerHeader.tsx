'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
      <div className="mx-auto max-w-screen-2xl" style={{ maxWidth: 1280 }}>
        <div className="lhdr-bar">
          <Link href="/learner" className="lhdr-logo">
            <Image
              src="/nfcap-logo.png"
              alt="NFCAP — National Flooring Contractors Apprenticeship Program"
              width={220}
              height={24}
              priority
              className="h-6 w-auto sm:h-7"
            />
          </Link>

          <nav className="hidden lhdr-nav lg:flex">
            {navItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('lhdr-navlink', active && 'on')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="lhdr-actions">
            <GlobalSearch />
            <NotificationsMenu />
            <div
              className="relative ml-1"
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
                className="lhdr-avatar"
              >
                {learnerInitial}
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
              <li className="mt-1" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <LogoutButton className="lhdr-mobile-navlink w-full" />
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
