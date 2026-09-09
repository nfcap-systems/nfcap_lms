import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type StatusTone = 'success' | 'pending' | 'restricted' | 'info' | 'danger' | 'neutral';

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-status-success-bg text-status-success-text border-status-success-border',
  pending: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  restricted: 'bg-status-restricted-bg text-status-restricted-text border-status-restricted-border',
  info: 'bg-status-info-bg text-status-info-text border-status-info-border',
  danger: 'bg-status-danger-bg text-status-danger-text border-status-danger-border',
  neutral: 'bg-bg-subtle text-text-secondary border-border-subtle',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
