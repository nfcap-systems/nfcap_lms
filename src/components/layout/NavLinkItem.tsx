'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { isNavItemActive } from '@/lib/nav';

/** A single top-nav link with its own active-state check, so a nav item can be rendered from an
 * async Server Component (which has no usePathname) without losing the 'on' highlight class. */
export function NavLinkItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, href);
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={cn('toplink', active && 'on')}>
      {label}
    </Link>
  );
}
