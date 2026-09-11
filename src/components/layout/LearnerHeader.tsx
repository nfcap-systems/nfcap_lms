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

  useEffect(() => () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }, []);

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
    <header className="sticky top-0 z-40 bg-bg-page/85 px-[50px] pt-3 pb-1 backdrop-blur-sm sm:pt-4">
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex h-16 items-center gap-3 rounded-2xl border border-border-subtle bg-bg-card px-3 shadow-card sm:gap-5 sm:px-4">
          <Link href="/learner" className="flex shrink-0 items-center">
            <Image
              src="/nfcap-logo.png"
              alt="NFCAP — National Flooring Contractors Apprenticeship Program"
              width={220}
              height={24}
              priority
              className="h-6 w-auto sm:h-7"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <div className="flex min-w-0 items-center gap-0.5 rounded-full bg-bg-subtle p-1">
              {navItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary xl:px-4',
                      active
                        ? 'bg-brand-accent text-on-brand shadow-sm'
                        : 'text-text-secondary hover:bg-accent-tint hover:text-accent-tint-text',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
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
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-on-brand transition-colors hover:bg-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              >
                {learnerInitial}
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  aria-label="Account"
                  className="absolute top-full right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-elevated"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-on-brand">
                      {learnerInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {learnerName}
                      </p>
                      <p className="truncate text-xs text-text-muted">{learnerEmail}</p>
                    </div>
                  </div>
                  <div className="border-t border-border-subtle p-1.5">
                    <Link
                      href="/learner/profile"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-accent-tint hover:text-accent-tint-text"
                    >
                      <Icon name="user" className="h-4.5 w-4.5" />
                      Profile
                    </Link>
                  </div>
                  <div className="border-t border-border-subtle p-1.5">
                    <LogoutButton
                      role="menuitem"
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-brand-accent transition-colors hover:bg-accent-tint"
                    >
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
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary lg:hidden"
            >
              <Icon name={mobileOpen ? 'x' : 'menu'} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="mt-2 rounded-2xl border border-border-subtle bg-bg-card p-2 shadow-card lg:hidden">
            <ul className="flex flex-col gap-0.5">
              {navItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onToggleMobile}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                        active
                          ? 'bg-brand-primary/10 text-brand-heading'
                          : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
                      )}
                    >
                      <Icon name={item.icon} className="h-4.5 w-4.5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-1 border-t border-border-subtle pt-2">
                <LogoutButton className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-muted hover:bg-bg-subtle hover:text-text-primary" />
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
