'use client';

import Link from 'next/link';

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
import { Skeleton } from '@/components/admin-ui/skeleton';
import { logout } from '@/lib/actions/auth';
import { getInitials } from '@/lib/utils';

/** Fallback for the `<Suspense>` wrapping ResolvedAccountMenu — sized to roughly match the real
 * avatar+chevron trigger button so it doesn't shift the header layout once the real menu streams
 * in. */
export function AccountMenuSkeleton() {
  return (
    <div className="flex items-center gap-1 p-1">
      <Skeleton className="size-6 rounded-lg" />
      <Skeleton className="h-3.5 w-3.5" />
    </div>
  );
}

/** The header's avatar+chevron account menu — a client component (DropdownMenu's onSelect
 * handlers can't cross a server/client boundary as props) fed resolved name/email from
 * ResolvedAccountMenu's own server-only `<Suspense>` boundary, so AdminHeader itself never has to
 * await the user. */
export function HeaderAccountMenu({
  name,
  email,
  accountHref,
}: {
  name: string;
  email: string;
  accountHref: string;
}) {
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
            <Link href={accountHref}>
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
