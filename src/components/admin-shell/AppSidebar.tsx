import Link from 'next/link';

import { adminNav } from '@/lib/nav';
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
  userName,
  userEmail,
  pendingReviewCount,
}: {
  userName: string;
  userEmail: string;
  pendingReviewCount: number;
}) {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/admin">
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
        <NavMain items={adminNav} />
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
        <NavUser name={userName} email={userEmail} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
