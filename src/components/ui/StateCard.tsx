import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** FND10-EmptyErrorLoading: one icon tile, one friendly line, one line of help, one optional
 * next-step action — never an illustration with no way forward. Used for empty lists, failed
 * loads, and "no results" states. */
export type StateCardProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'problem';
};

export function StateCard({ icon, title, description, action, tone = 'neutral', className, ...props }: StateCardProps) {
  return (
    <div className={cn('state-card', className)} {...props}>
      {icon && (
        <div
          className="state-icon"
          style={
            tone === 'problem'
              ? { color: 'var(--status-problem)', background: 'var(--status-problem-bg)' }
              : undefined
          }
        >
          {icon}
        </div>
      )}
      <b>{title}</b>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

/** FND10/FND03: skeleton loading shaped like the content it replaces, 1.2s shimmer, stopped
 * under prefers-reduced-motion. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />;
}
