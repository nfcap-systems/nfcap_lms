import { AppShell } from '@/components/layout/AppShell';
import { partnerNav } from '@/lib/nav';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="partner" navItems={partnerNav}>
      {children}
    </AppShell>
  );
}
