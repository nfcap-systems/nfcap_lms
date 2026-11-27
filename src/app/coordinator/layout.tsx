import { Suspense, type CSSProperties } from 'react';
import { AppSidebar } from '@/components/admin-shell/AppSidebar';
import { AdminHeader } from '@/components/admin-shell/AdminHeader';
import { AccountMenuSkeleton } from '@/components/admin-shell/HeaderAccountMenu';
import { ResolvedAccountMenu } from '@/components/admin-shell/ResolvedAccountMenu';
import { ResolvedStaffNotifications } from '@/components/admin-shell/ResolvedStaffNotifications';
import { SidebarInset, SidebarProvider } from '@/components/admin-ui/sidebar';
import { TooltipProvider } from '@/components/admin-ui/tooltip';
import { coordinatorNav } from '@/lib/nav';

// Same admin-ui shell as /admin (src/app/admin/layout.tsx), reusing AppSidebar/AdminHeader with
// coordinator's own basePath/navItems/account route instead of a duplicate copy — coordinator and
// partner previously ran on the old src/components/layout/AppShell shell (the "sshell-*" CSS
// classes), which never got the sidebar overflow fix admin-ui's shell has. Admin's own layout is
// untouched: it doesn't pass basePath/navItems/accountHref, so it keeps its exact current output.
//
// Deliberately NOT an async function awaiting getAuthUser() here — see the matching comment in
// src/app/admin/layout.tsx for why: it used to tie the whole static shell to the per-user auth
// fetch, which could serve an incomplete cached render on first load.
export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider
        data-system="staff"
        style={{ '--sidebar-width': 'calc(var(--spacing) * 68)' } as CSSProperties}
      >
        <AppSidebar basePath="/coordinator" navItems={coordinatorNav} showQuickCreate={false} />
        <SidebarInset>
          <AdminHeader
            navItems={coordinatorNav}
            notificationsMenu={
              <Suspense fallback={null}>
                <ResolvedStaffNotifications />
              </Suspense>
            }
            accountMenu={
              <Suspense fallback={<AccountMenuSkeleton />}>
                <ResolvedAccountMenu accountHref="/coordinator/account" />
              </Suspense>
            }
          />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
