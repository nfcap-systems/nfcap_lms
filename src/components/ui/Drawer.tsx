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
        className={cn('modal-scrim absolute inset-0 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
      />
      <div
        className={cn(
          'drawer absolute top-0 h-full w-full max-w-md transition-transform',
          side === 'right' ? 'right-0' : 'left-0',
          open ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full',
          panelClassName,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-muted)' }}>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close panel" className="btn-icon">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>
  );
}
