'use client';

import { Icon } from '@/components/icons';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsMenu } from './NotificationsMenu';

export type HeaderProps = {
  title: string;
  subtitle?: string;
  onOpenMobileNav: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapsed: () => void;
};

export function Header({
  title,
  subtitle,
  onOpenMobileNav,
  sidebarCollapsed,
  onToggleSidebarCollapsed,
}: HeaderProps) {
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 rounded-t-2xl bg-bg-card px-4 py-3 shadow-card sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="rounded-md p-2 text-text-secondary hover:bg-bg-subtle lg:hidden"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onToggleSidebarCollapsed}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={sidebarCollapsed}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden shrink-0 rounded-md p-2 text-text-secondary hover:bg-bg-subtle hover:text-text-primary lg:flex"
      >
        <Icon name="panel-left" className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-[-0.01em] text-text-primary sm:text-lg">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-text-muted sm:text-sm">{subtitle}</p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <GlobalSearch />
        <NotificationsMenu />
      </div>
    </header>
  );
}
