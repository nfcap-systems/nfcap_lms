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
    <div className={cn('flex flex-col', className)} {...props}>
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
