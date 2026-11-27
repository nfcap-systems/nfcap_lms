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

export type LearnerHeaderProps = {
  navItems: NavItem[];
  learnerName: string;
  learnerEmail: string;
  learnerInitial: string;
  /** Rendered after the mapped navItems — a Server Component slot (e.g. the Suspense-wrapped
   * WioaNavLink) that resolves independently instead of blocking the rest of the header. */
  extraNavSlot?: React.ReactNode;
  /** Suspense-wrapped ResolvedLearnerNotifications (NOTIF-1) — rendered at both the desktop and
   * mobile bell positions below, same "same slot, two positions, CSS breakpoint picks which one
   * is visible" pattern this file already uses for accountMenu. */
  notificationsSlot?: React.ReactNode;
};

// Mobile bottom bar always shows these 4 in this order, regardless of navItems' own order —
// whatever's left over (Certificates today) falls through to the "More" sheet below, alongside
// extraNavSlot (Funding) and the still-inert Messages row. Picked from the mobile-nav mockups in
// temp_ss/mockups/learner-mobile-nav-final.html (greeting top bar + 5-tab bottom bar + sheet).
const BOTTOM_BAR_HREFS = [
  '/learner',
  '/learner/my-learning',
  '/learner/explore',
  '/learner/portfolio',
];

// Shorter labels for the bottom bar's tight tab width — same destinations as the full nav label.
const BOTTOM_BAR_LABEL: Record<string, string> = {
  '/learner': 'Home',
  '/learner/my-learning': 'Learning',
  '/learner/explore': 'Explore',
  '/learner/portfolio': 'Portfolio',
};

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Ported literally from the design canvas's LearnerHeader.dc.html for desktop (two-row sticky
// header). Mobile/responsive was a deliberate deferral at the time of that port (decision 4,
// docs/plans/mockup-complete-build.md) — this is that revisit. No mobile mockup board exists for
// the header, so the mobile shape below follows a direct user-approved reference (greeting +
// avatar + bell top bar, a 5-tab bottom bar, and a "More" sheet for the overflow nav items) rather
// than inventing one from scratch. See docs/build/LRN_BATCH_DRIFT.md for the desktop port.
export function LearnerHeader({
  navItems,
  learnerName,
  learnerEmail,
  learnerInitial,
  extraNavSlot,
  notificationsSlot,
}: LearnerHeaderProps) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const mobileAccountRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setAccountOpen(false);
    setMoreSheetOpen(false);
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
      const target = event.target as Node;
      const insideDesktop = accountRef.current?.contains(target);
      const insideMobile = mobileAccountRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) setAccountOpen(false);
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

  useEffect(() => {
    if (!moreSheetOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreSheetOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [moreSheetOpen]);

  const firstName = learnerName.split(' ')[0] || learnerName;
  const bottomNavItems = BOTTOM_BAR_HREFS.map((href) =>
    navItems.find((item) => item.href === href),
  ).filter((item): item is NavItem => Boolean(item));
  const overflowNavItems = navItems.filter((item) => !BOTTOM_BAR_HREFS.includes(item.href));

  const accountMenu = accountOpen && (
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
  );

  return (
    <header className="lhdr">
      {/* Row 1 (desktop) — brand, Ask AI, search, utility icons, persistent account. Hidden below
          --lhdr-mobile-bp in favor of the mobile top bar just below. */}
      <div className="lhdr-row1">
        <div className="lhdr-row1-inner">
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

          <div className="lhdr-search-wrap">
            <GlobalSearch variant="pill" navItems={navItems} />
          </div>

          <div className="lhdr-spacer" />

          <div className="lhdr-utility">
            {/* Inert pending a real Inbox UI — Messaging's backend/RLS exists (Layer 1), no route yet. */}
            <button type="button" aria-label="Messages" disabled className="lhdr-iconbtn2">
              <Icon name="message-circle" className="h-4.5 w-4.5" />
            </button>
            {notificationsSlot}
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

              {accountMenu}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile top bar — avatar + greeting + bell, then a full-width search pill. Only visible
          below --lhdr-mobile-bp (design-system.css). Tapping the avatar opens the same account
          menu as the desktop one, just anchored here instead. */}
      <div className="lhdr-mobiletop">
        <div className="lhdr-mobiletop-row">
          <div className="relative" ref={mobileAccountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label="Account menu"
              className="lhdr-mobiletop-greet"
            >
              <span className="lhdr-avatar lhdr-avatar-lg">{learnerInitial}</span>
              <span className="lhdr-mobiletop-greet-text">
                {/* suppressHydrationWarning: see the matching comment in HomeView.tsx — server vs.
                    browser local-hour differences can flip this text across SSR/hydration. */}
                <span className="hi" suppressHydrationWarning>
                  {timeOfDayGreeting()}, {firstName}
                </span>
                <span className="sub">Learner</span>
              </span>
            </button>
            {accountMenu}
          </div>
          {notificationsSlot}
        </div>
        <div className="lhdr-mobiletop-search">
          <GlobalSearch variant="pill" navItems={navItems} />
        </div>
      </div>

      {/* Row 2 (desktop nav strip) — underline-active, scrolls horizontally. Hidden below
          --lhdr-mobile-bp in favor of the bottom tab bar + "More" sheet. */}
      <nav className="lhdr-row2">
        <div className="lhdr-row2-inner">
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
          {extraNavSlot}
        </div>
      </nav>

      {/* Mobile bottom tab bar — Home/My Learning/Explore/Portfolio plus "More" for the rest. */}
      <nav className="lhdr-bottombar" aria-label="Primary">
        {bottomNavItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn('lhdr-bb-item', active && 'on')}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {BOTTOM_BAR_LABEL[item.href] ?? item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreSheetOpen((open) => !open)}
          aria-haspopup="dialog"
          aria-expanded={moreSheetOpen}
          className={cn('lhdr-bb-item', moreSheetOpen && 'on')}
        >
          <Icon name="more-horizontal" className="h-5 w-5" />
          More
        </button>
      </nav>

      {moreSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="lhdr-sheet-scrim"
            onClick={() => setMoreSheetOpen(false)}
          />
          <div role="dialog" aria-label="More" className="lhdr-sheet">
            <div className="lhdr-sheet-handle" />
            {overflowNavItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreSheetOpen(false)}
                  className={cn('lhdr-sheet-row', active && 'on')}
                >
                  <span className="ic">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="t">{item.label}</span>
                </Link>
              );
            })}
            {/* extraNavSlot (Funding) renders NavLinkItem's shared `.toplink` markup, not a sheet
                row — restyled in design-system.css instead of forking that shared component. */}
            {extraNavSlot && (
              <div onClick={() => setMoreSheetOpen(false)} className="lhdr-sheet-extra">
                {extraNavSlot}
              </div>
            )}
            {/* Inert pending a real Inbox UI — same disabled state as the desktop icon button. */}
            <div className="lhdr-sheet-row disabled" aria-disabled="true">
              <span className="ic">
                <Icon name="message-circle" className="h-5 w-5" />
              </span>
              <span className="t">
                Messages
                <span className="lhdr-sheet-soon">Soon</span>
              </span>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
