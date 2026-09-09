'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { isNavItemActive } from '@/lib/nav';
import type { NavItem } from '@/lib/nav';
import { LogoutButton } from './LogoutButton';

export type LearnerHeaderProps = {
  navItems: NavItem[];
  learnerInitial: string;
  mobileOpen: boolean;
  onToggleMobile: () => void;
};

export function LearnerHeader({
  navItems,
  learnerInitial,
  mobileOpen,
  onToggleMobile,
}: LearnerHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
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

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'text-brand-heading' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-full bg-brand-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LogoutButton className="hidden text-xs font-medium text-text-muted hover:text-text-primary xl:inline-block" />
          <Link
            href="/learner/profile"
            aria-label="Profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-subtle text-sm font-semibold text-brand-primary hover:bg-brand-primary/10"
          >
            {learnerInitial}
          </Link>
          <button
            type="button"
            onClick={onToggleMobile}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-subtle lg:hidden"
          >
            <Icon name={mobileOpen ? 'x' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border-subtle bg-bg-card px-4 py-3 lg:hidden">
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
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
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
              <LogoutButton className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium text-text-muted hover:bg-bg-subtle hover:text-text-primary" />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
