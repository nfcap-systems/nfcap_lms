import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  tableFeatures,
} from '@tanstack/react-table';

/** TanStack Table v9 feature registry shared by every admin-ui data table — just sort + pagination.
 * Search is done by pre-filtering the row array in plain JS before it reaches the table (no
 * column-filter feature needed), since no admin page here needs per-column filter dropdowns. */
export const adminTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, datetime: sortFn_datetime },
});

export type AdminTableFeatures = typeof adminTableFeatures;
