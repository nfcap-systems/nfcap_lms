'use client';

import { usePathname } from 'next/navigation';

import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { adminNav, getActiveNavLabel } from '@/lib/nav';
import { Separator } from '@/components/admin-ui/separator';
import { SidebarTrigger } from '@/components/admin-ui/sidebar';

export function AdminHeader({ firstName }: { firstName: string }) {
  const pathname = usePathname();
  const isDashboardRoot = pathname === '/admin';
  const title = isDashboardRoot
    ? `Welcome, ${firstName || 'there'}`
    : getActiveNavLabel(pathname, adminNav, 'Admin');

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="truncate text-base font-semibold">{title}</h1>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <GlobalSearch />
        <NotificationsMenu />
      </div>
    </header>
  );
}
