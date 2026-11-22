import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** ADM04's completion-ring avatar: an SVG progress ring around the initials avatar. */
export type CompletionRingProps = {
  percentage: number;
  initials: string;
  size?: number;
  className?: string;
};

export function CompletionRing({ percentage, initials, size = 76, className }: CompletionRingProps) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, percentage)) / 100);

  return (
    <div className={cn('pring', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="avatar">{initials}</div>
    </div>
  );
}

/** ADM04's profile/detail header: ring avatar, name/subtitle, badge row, trailing actions. */
export function ProfileHeader({
  left,
  actions,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { left: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn('phdr', className)} {...props}>
      <div className="phdr-left">{left}</div>
      {actions && <div className="phdr-actions">{actions}</div>}
    </div>
  );
}

export type ProfileTab = {
  key: string;
  label: string;
};

export type ProfileTabsProps = {
  tabs: ProfileTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

/** ADM04's `.ptabs`/`.ptab` tab bar — underline-style, not pill-style. */
export function ProfileTabs({ tabs, active, onChange, className }: ProfileTabsProps) {
  return (
    <div className={cn('ptabs', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          className={cn('ptab', tab.key === active && 'on')}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
