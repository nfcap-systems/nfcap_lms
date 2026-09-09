import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type FieldProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
};

export function Field({ label, hint, error, htmlFor, className, children, ...props }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...props}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-status-danger-text">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
