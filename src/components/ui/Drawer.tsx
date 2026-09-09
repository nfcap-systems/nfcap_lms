'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: 'left' | 'right';
  /** Width class for the panel, e.g. "max-w-md". Defaults to a form-sized panel. */
  panelClassName?: string;
  className?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  panelClassName,
  className,
}: DrawerProps) {
  return (
    <div
      className={cn('fixed inset-0 z-50', open ? '' : 'pointer-events-none', className)}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-slate-900/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'absolute top-0 flex h-full w-full max-w-md flex-col bg-bg-card shadow-elevated transition-transform',
          side === 'right' ? 'right-0' : 'left-0',
          open ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full',
          panelClassName,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle p-5">
          <div>
            {title && <h2 className="text-base font-semibold text-brand-heading">{title}</h2>}
            {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-md p-1 text-text-muted hover:bg-bg-subtle hover:text-text-primary"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle p-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
