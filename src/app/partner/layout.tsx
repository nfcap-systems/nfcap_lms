import { AppShell } from '@/components/layout/AppShell';
import { partnerNav } from '@/lib/nav';
import { getAuthUser } from '@/lib/supabase/server';

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const userName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';

  return (
    <AppShell
      role="partner"
      navItems={partnerNav}
      userName={userName}
      userEmail={user?.email ?? ''}
    >
      {children}
    </AppShell>
  );
}
