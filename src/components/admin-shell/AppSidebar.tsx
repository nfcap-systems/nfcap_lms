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
  SidebarRail,
} from '@/components/admin-ui/sidebar';

import { NavMain } from './NavMain';
import { NavUser } from './NavUser';
import { SidebarPromoBanner } from './SidebarPromoBanner';

export function AppSidebar({
  basePath = '/admin',
  navItems = adminNav,
  showQuickCreate = true,
  userName,
  userEmail,
  pendingReviewCount = 0,
}: {
  /** Defaults to today's Admin values — other admin-ui-shell roles (coordinator, partner) pass
   * their own basePath/navItems to reuse this same sidebar rather than a duplicate copy. */
  basePath?: string;
  navItems?: NavEntry[];
  showQuickCreate?: boolean;
  userName: string;
  userEmail: string;
  pendingReviewCount?: number;
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
        {pendingReviewCount > 0 && (
          <SidebarPromoBanner
            icon="check"
            title={`${pendingReviewCount} submission${pendingReviewCount === 1 ? '' : 's'} waiting`}
            description="Evidence is in your Review Queue, ready to go."
            href="/admin/reviews"
          />
        )}
        <NavUser name={userName} email={userEmail} accountHref={`${basePath}/account`} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
