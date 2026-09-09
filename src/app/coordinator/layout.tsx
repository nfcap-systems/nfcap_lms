import { AppShell } from '@/components/layout/AppShell';
import { coordinatorNav } from '@/lib/nav';

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="coordinator" navItems={coordinatorNav}>
      {children}
    </AppShell>
  );
}
