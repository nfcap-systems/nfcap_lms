import type { CSSProperties } from 'react';
import { AppSidebar } from '@/components/admin-shell/AppSidebar';
import { AdminHeader } from '@/components/admin-shell/AdminHeader';
import { SidebarInset, SidebarProvider } from '@/components/admin-ui/sidebar';
import { TooltipProvider } from '@/components/admin-ui/tooltip';
import { getAuthUser } from '@/lib/supabase/server';
import { getPendingReviewCount } from '@/lib/data/progress';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, pendingReviewCount] = await Promise.all([getAuthUser(), getPendingReviewCount()]);
  const userName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  const userEmail = user?.email ?? '';

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
        <AppSidebar
          userName={userName}
          userEmail={userEmail}
          pendingReviewCount={pendingReviewCount}
        />
        <SidebarInset>
          <AdminHeader userName={userName} userEmail={userEmail} />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
