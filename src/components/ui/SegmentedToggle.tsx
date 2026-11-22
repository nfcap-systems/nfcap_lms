import { cn } from '@/lib/cn';

export type SegmentedToggleOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedToggleProps<T extends string> = {
  options: SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** The pill date-range / list-grid toggle pattern shared across Staff dashboards and reports. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedToggleProps<T>) {
  return (
    <div className={cn('segrange', className)} role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(option.value === value && 'on')}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
