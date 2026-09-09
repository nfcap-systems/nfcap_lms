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
        <div className="mb-1.5 flex items-center justify-between text-xs text-text-secondary">
          {label && <span>{label}</span>}
          {showPercentage && (
            <span className="font-medium text-text-primary">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle"
      >
        <div
          className="h-full rounded-full bg-brand-accent transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
