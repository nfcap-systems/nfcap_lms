'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';

export function NotificationsMenu({
  variant = 'icon',
}: { variant?: 'icon' | 'plain' | 'ghost' } = {}) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Notifications"
        className={
          variant === 'plain'
            ? 'lhdr-iconbtn2'
            : variant === 'ghost'
              ? 'relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              : 'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--ink-muted)] shadow-sm transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'
        }
      >
        <Icon name="bell" className={variant === 'ghost' ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={`absolute top-full mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--nfcap-border)] bg-[var(--surface)] shadow-elevated ${variant === 'plain' ? 'left-0' : 'right-0'}`}
        >
          <p className="border-b border-[var(--nfcap-border)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
            Notifications
          </p>
          <p className="px-4 py-6 text-center text-sm text-[var(--ink-muted)]">
            You&apos;re all caught up — nothing new yet.
          </p>
        </div>
      )}
    </div>
  );
}
