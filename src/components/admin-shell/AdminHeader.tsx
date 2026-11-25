'use client';

import type { ReactNode } from 'react';

import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { Separator } from '@/components/admin-ui/separator';
import { SidebarTrigger } from '@/components/admin-ui/sidebar';
import { adminNav, type NavEntry } from '@/lib/nav';

/** ADM01-Shell's `.hdr` row — collapse icon, divider, search pill on the left; notifications and
 * an avatar+chevron account menu on the right. No page title lives in this bar on any board; each
 * page's own heading/greeting is in its `.pagehdr`, inside the body below (see DashboardView). */
export function AdminHeader({
  accountMenu,
  navItems = adminNav,
}: {
  /** A `<Suspense>`-wrapped `ResolvedAccountMenu` from the layout — kept as a slot rather than
   * fetched here so this static chrome (search bar, notifications, the header's own border)
   * never has to wait on `getAuthUser()`. See CLAUDE.md performance rule #1 and the comment on
   * ResolvedAccountMenu for why: an admin layout awaiting the user directly used to make Next's
   * Partial Prerendering treat the whole header/sidebar as one dynamic unit, which could cache an
   * incomplete first-request render and serve it to everyone until it revalidated — that's what
   * caused the sidebar border/Quick Create button to intermittently go missing on first load. */
  accountMenu: ReactNode;
  /** Defaults to today's Admin nav — coordinator/partner pass their own so the search bar's
   * "Go to" shortcuts match the sidebar they actually have, not Admin's. */
  navItems?: NavEntry[];
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <GlobalSearch variant="bar" navItems={navItems} />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <NotificationsMenu variant="ghost" />
        {accountMenu}
      </div>
    </header>
  );
}
