import { cn } from '@/lib/cn';

export type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between text-xs" style={{ color: 'var(--ink-muted)' }}>
          {label && <span>{label}</span>}
          {showPercentage && (
            <span className="font-medium" style={{ color: 'var(--ink)' }}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="ds-progress-track"
      >
        <div className="ds-progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
