'use client';

import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { Separator } from '@/components/admin-ui/separator';
import { SidebarTrigger } from '@/components/admin-ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/admin-ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/admin-ui/dropdown-menu';
import { Icon } from '@/components/icons';
import { logout } from '@/lib/actions/auth';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

/** ADM01-Shell's `.hdr` row — collapse icon, divider, search pill on the left; notifications and
 * an avatar+chevron account menu on the right. No page title lives in this bar on any board; each
 * page's own heading/greeting is in its `.pagehdr`, inside the body below (see DashboardView). */
export function AdminHeader({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <GlobalSearch variant="bar" />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <NotificationsMenu variant="ghost" />
        <AccountMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}

function AccountMenu({ name, email }: { name: string; email: string }) {
  const displayName = name || email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Account menu"
        >
          <Avatar size="sm">
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <Icon name="chevron-down" className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/admin/account">
              <Icon name="user" className="size-4" />
              Account
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void logout();
          }}
        >
          <Icon name="log-out" className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
