'use client';

import { logout } from '@/lib/actions/auth';

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button type="submit" className={className}>
        Log out
      </button>
    </form>
  );
}
