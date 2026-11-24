import type { CSSProperties } from 'react';
import { AppSidebar } from '@/components/admin-shell/AppSidebar';
import { AdminHeader } from '@/components/admin-shell/AdminHeader';
import { SidebarInset, SidebarProvider } from '@/components/admin-ui/sidebar';
import { TooltipProvider } from '@/components/admin-ui/tooltip';
import { partnerNav } from '@/lib/nav';
import { getAuthUser } from '@/lib/supabase/server';

// Same admin-ui shell as /admin and /coordinator (src/app/coordinator/layout.tsx), reusing
// AppSidebar/AdminHeader with partner's own basePath/navItems/account route instead of a
// duplicate copy. Admin's own layout is untouched: it doesn't pass basePath/navItems/accountHref,
// so it keeps its exact current output.
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
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
          basePath="/partner"
          navItems={partnerNav}
          showQuickCreate={false}
          userName={userName}
          userEmail={userEmail}
        />
        <SidebarInset>
          <AdminHeader
            userName={userName}
            userEmail={userEmail}
            accountHref="/partner/account"
            navItems={partnerNav}
          />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
