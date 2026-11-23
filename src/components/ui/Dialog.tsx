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
      // `className`'s own max-w-* and `max-w-md` below are equal-specificity Tailwind utilities,
      // so plain string concatenation (this project's `cn` has no tailwind-merge dedup) lets
      // either one win depending on generated CSS order, not source order — so the default only
      // appears when the caller doesn't supply its own width.
      className={cn('modal w-full p-0', className ?? 'max-w-md')}
    >
      <div className="flex items-start justify-between gap-4 p-7 pb-0">
        <div>
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="btn-icon">
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      {children && <div className="p-7 pt-0">{children}</div>}
      {footer && (
        <div
          className="flex items-center justify-end gap-3 border-t p-7"
          style={{ borderColor: 'var(--nfcap-border)' }}
        >
          {footer}
        </div>
      )}
    </dialog>
  );
}
