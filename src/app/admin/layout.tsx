import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/lib/nav';
import { getAuthUser } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const userName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';

  return (
    <AppShell role="admin" navItems={adminNav} userName={userName} userEmail={user?.email ?? ''}>
      {children}
    </AppShell>
  );
}
