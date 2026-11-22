import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** FND08/ADM03's canonical data-table shell — the standard card wrapper for every Staff list
 * view (header with title/description/actions, a filters row, the table itself, a footer). This
 * provides the shell classes; callers render their own <table className="data-table"> inside. */
export function DataTableCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('dtcard', className)} {...props} />;
}

export function DataTableCardHeader({
  title,
  description,
  actions,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn('dtcard-head', className)} {...props}>
      <div>
        <div className="dtcard-title">{title}</div>
        {description && <div className="dtcard-desc">{description}</div>}
      </div>
      {actions && <div className="dtcard-actions">{actions}</div>}
    </div>
  );
}

export function DataTableFilters({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('dt-filters-row', className)} {...props} />;
}

export function DataTableSelectionRow({
  count,
  total,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { count: number; total: number }) {
  return (
    <div className={cn('dt-selrow', className)} {...props}>
      <span className="dt-selcount">
        {count} of {total} row(s) selected
      </span>
    </div>
  );
}

export function DataTableFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('dt-footer', className)} {...props} />;
}

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  return (
    <nav className={cn('pagination', className)} aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={n === page ? 'on' : undefined}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => onPageChange(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
