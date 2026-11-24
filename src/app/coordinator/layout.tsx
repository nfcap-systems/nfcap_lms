import type { CSSProperties } from 'react';
import { AppSidebar } from '@/components/admin-shell/AppSidebar';
import { AdminHeader } from '@/components/admin-shell/AdminHeader';
import { SidebarInset, SidebarProvider } from '@/components/admin-ui/sidebar';
import { TooltipProvider } from '@/components/admin-ui/tooltip';
import { coordinatorNav } from '@/lib/nav';
import { getAuthUser } from '@/lib/supabase/server';

// Same admin-ui shell as /admin (src/app/admin/layout.tsx), reusing AppSidebar/AdminHeader with
// coordinator's own basePath/navItems/account route instead of a duplicate copy — coordinator and
// partner previously ran on the old src/components/layout/AppShell shell (the "sshell-*" CSS
// classes), which never got the sidebar overflow fix admin-ui's shell has. Admin's own layout is
// untouched: it doesn't pass basePath/navItems/accountHref, so it keeps its exact current output.
export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const userName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  const userEmail = user?.email ?? '';

  return (
    <TooltipProvider>
      <SidebarProvider
        data-system="staff"
        style={{ '--sidebar-width': 'calc(var(--spacing) * 68)' } as CSSProperties}
      >
        <AppSidebar
          basePath="/coordinator"
          navItems={coordinatorNav}
          showQuickCreate={false}
          userName={userName}
          userEmail={userEmail}
        />
        <SidebarInset>
          <AdminHeader
            userName={userName}
            userEmail={userEmail}
            accountHref="/coordinator/account"
            navItems={coordinatorNav}
          />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
