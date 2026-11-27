'use client';

import { Icon } from '@/components/icons';
import { GlobalSearch } from './GlobalSearch';
import { StaffNotificationsBell } from '@/components/admin-shell/StaffNotificationsBell';

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
    <header className="sshell-header">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="btn-icon lg:hidden"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onToggleSidebarCollapsed}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={sidebarCollapsed}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="btn-icon hidden shrink-0 lg:flex"
      >
        <Icon name="panel-left" className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold sm:text-lg" style={{ color: 'var(--ink)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs sm:text-sm" style={{ color: 'var(--ink-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <GlobalSearch />
        {/* This component (and AppShell, which is its only consumer) is unreachable from any live
            route today — coordinator/partner moved off it onto the admin-ui shell
            (src/app/coordinator/layout.tsx's own comment). No userId is available here to fetch
            real notifications, and nothing can exercise this in the running app, so this is a
            static placeholder rather than live data — kept compiling, not verified. */}
        <StaffNotificationsBell notifications={[]} unreadCount={0} />
      </div>
    </header>
  );
}
