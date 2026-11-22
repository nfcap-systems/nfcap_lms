import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type StatusTone = 'success' | 'pending' | 'restricted' | 'info' | 'danger' | 'neutral';

/** Maps to FND07-StatusBadges' shared triad: complete (green), pending (amber), problem (red),
 * neutral, and accent (the Learner/Staff accent color, used for "info"/active-state badges). */
const toneClasses: Record<StatusTone, string> = {
  success: 'badge-complete',
  pending: 'badge-pending',
  restricted: 'badge-problem',
  danger: 'badge-problem',
  info: 'badge-accent',
  neutral: 'badge-neutral',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return <span className={cn(toneClasses[tone], className)} {...props} />;
}
