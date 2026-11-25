import { Suspense, type CSSProperties } from 'react';
import { AppSidebar } from '@/components/admin-shell/AppSidebar';
import { AdminHeader } from '@/components/admin-shell/AdminHeader';
import { ResolvedAccountMenu } from '@/components/admin-shell/ResolvedAccountMenu';
import { AccountMenuSkeleton } from '@/components/admin-shell/HeaderAccountMenu';
import { SidebarInset, SidebarProvider } from '@/components/admin-ui/sidebar';
import { TooltipProvider } from '@/components/admin-ui/tooltip';

// Deliberately NOT an async function awaiting getAuthUser() here. That used to make Next's
// Partial Prerendering treat the whole shell (sidebar nav, Quick Create, every border) as one
// dynamic unit tied to the per-user auth fetch — which could cache an incomplete first-request
// render and serve it to everyone until the next revalidation, intermittently dropping the
// sidebar border/Quick Create button on first load. getAuthUser() now only happens inside
// ResolvedAccountMenu/ResolvedNavUser, each under its own <Suspense>, so only the account
// name/avatar is dynamic — see the comment on AdminHeader's `accountMenu` prop.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      {/* 272px (17rem), matching Sidebar.dc.html's own width and the reference template's
          `calc(var(--spacing) * 68)` — overridden here via the CSS var SidebarProvider already
          exposes for exactly this, not by changing admin-ui/sidebar.tsx's shared default, so any
          other consumer of the same component keeps its own width unless it opts in the same way. */}
      <SidebarProvider
        data-system="staff"
        style={{ '--sidebar-width': 'calc(var(--spacing) * 68)' } as CSSProperties}
      >
        <AppSidebar showPendingReview />
        <SidebarInset>
          <AdminHeader
            accountMenu={
              <Suspense fallback={<AccountMenuSkeleton />}>
                <ResolvedAccountMenu accountHref="/admin/account" />
              </Suspense>
            }
          />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
