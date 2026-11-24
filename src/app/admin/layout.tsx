import { AppSidebar } from '@/components/admin-shell/AppSidebar';
import { AdminHeader } from '@/components/admin-shell/AdminHeader';
import { SidebarInset, SidebarProvider } from '@/components/admin-ui/sidebar';
import { TooltipProvider } from '@/components/admin-ui/tooltip';
import { getAuthUser } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const userName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  const userEmail = user?.email ?? '';

  return (
    <TooltipProvider>
      <SidebarProvider data-system="staff">
        <AppSidebar userName={userName} userEmail={userEmail} />
        <SidebarInset>
          <AdminHeader userName={userName} userEmail={userEmail} />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
