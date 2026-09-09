import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/lib/nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="admin" navItems={adminNav}>
      {children}
    </AppShell>
  );
}
