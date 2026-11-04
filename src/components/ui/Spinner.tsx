import { cn } from '@/lib/cn';

export type SpinnerProps = {
  className?: string;
};

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'h-6 w-6 animate-spin rounded-full border-2 border-bg-subtle border-t-brand-accent',
        className,
      )}
    />
  );
}

/** Default content for a route segment's loading.tsx — Next shows this in place of the page
 * while its async Server Component data is still loading (docs/build/PERFORMANCE_PLAN.md §5.1,
 * convention #2 in CLAUDE.md). */
export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <Spinner />
    </div>
  );
}
