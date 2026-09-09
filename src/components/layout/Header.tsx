'use client';

import { Icon } from '@/components/icons';
import { LogoutButton } from './LogoutButton';

export type HeaderProps = {
  title: string;
  onOpenMobileNav: () => void;
};

export function Header({ title, onOpenMobileNav }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-card px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="rounded-md p-2 text-text-secondary hover:bg-bg-subtle lg:hidden"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>
      <h1 className="text-base font-semibold tracking-[-0.01em] text-text-primary sm:text-lg">
        {title}
      </h1>
      <LogoutButton className="ml-auto text-xs font-medium text-text-muted hover:text-text-primary" />
    </header>
  );
}
