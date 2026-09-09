'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'w-full max-w-md rounded-2xl border border-border-subtle bg-bg-card p-0 shadow-elevated backdrop:bg-slate-900/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5 pb-0">
        <div>
          {title && <h2 className="text-base font-semibold text-brand-heading">{title}</h2>}
          {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-md p-1 text-text-muted hover:bg-bg-subtle hover:text-text-primary"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      {children && <div className="p-5">{children}</div>}
      {footer && (
        <div className="flex items-center justify-end gap-3 border-t border-border-subtle p-5">
          {footer}
        </div>
      )}
    </dialog>
  );
}
