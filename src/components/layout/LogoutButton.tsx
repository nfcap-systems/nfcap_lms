'use client';

import type { ReactNode } from 'react';
import { logout } from '@/lib/actions/auth';

export type LogoutButtonProps = {
  className?: string;
  'aria-label'?: string;
  title?: string;
  role?: string;
  children?: ReactNode;
};

export function LogoutButton({ className, children, ...props }: LogoutButtonProps) {
  return (
    <form action={logout}>
      <button type="submit" className={className} {...props}>
        {children ?? 'Log out'}
      </button>
    </form>
  );
}
