import { Suspense } from 'react';
import Link from 'next/link';

import { adminNav } from '@/lib/nav';
import type { NavEntry } from '@/lib/nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from '@/components/admin-ui/sidebar';

import { NavMain } from './NavMain';
import { PendingReviewBanner } from './PendingReviewBanner';
import { ResolvedNavUser } from './ResolvedNavUser';

export function AppSidebar({
  basePath = '/admin',
  navItems = adminNav,
  showQuickCreate = true,
  showPendingReview = false,
}: {
  /** Defaults to today's Admin values — other admin-ui-shell roles (coordinator, partner) pass
   * their own basePath/navItems to reuse this same sidebar rather than a duplicate copy. */
  basePath?: string;
  navItems?: NavEntry[];
  showQuickCreate?: boolean;
  /** Only Admin has a Review Queue — coordinator/partner don't pass this. */
  showPendingReview?: boolean;
}) {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href={basePath}>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  N
                </div>
                <span className="text-base font-semibold">NFCAP LMS</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} showQuickCreate={showQuickCreate} />
      </SidebarContent>
      <SidebarFooter className="gap-3">
        {showPendingReview && (
          <Suspense fallback={null}>
            <PendingReviewBanner />
          </Suspense>
        )}
        {/* ResolvedNavUser does its own `getAuthUser()` fetch under this Suspense boundary so
            that fetch's dynamic/postponed status stays scoped to just the footer's name/email —
            see the comment on AdminHeader's `accountMenu` prop for why this matters. */}
        <Suspense fallback={<NavUserSkeleton />}>
          <ResolvedNavUser accountHref={`${basePath}/account`} />
        </Suspense>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuSkeleton showIcon />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
