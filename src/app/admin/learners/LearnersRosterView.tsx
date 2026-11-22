'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';

import { getCourseStatus } from '@/lib/course-status';
import { adminTableFeatures, type AdminTableFeatures } from '@/lib/admin-table-features';
import { getInitials } from '@/lib/utils';
import type { LearnerRecord } from '@/lib/data/learners';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import { Avatar, AvatarFallback } from '@/components/admin-ui/avatar';
import { Badge } from '@/components/admin-ui/badge';
import { Button } from '@/components/admin-ui/button';
import { Input } from '@/components/admin-ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin-ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/admin-ui/table';

type LearnerRow = {
  learner: LearnerRecord;
  enrolledCount: number;
  totalCourses: number;
  pendingCount: number;
};

const columns: ColumnDef<AdminTableFeatures, LearnerRow>[] = [
  {
    accessorKey: 'learner',
    header: 'Learner',
    sortFn: 'alphanumeric',
    accessorFn: (row) => row.learner.name,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(row.original.learner.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {row.original.learner.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">{row.original.learner.email}</div>
        </div>
      </div>
    ),
  },
  {
    id: 'progress',
    header: 'Courses',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.enrolledCount} of {row.original.totalCourses}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) =>
      row.original.pendingCount > 0 ? (
        <Badge variant="warning">{row.original.pendingCount} awaiting review</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
];

export function LearnersRosterView({
  learners,
  courses,
  progressByLearner,
}: {
  learners: LearnerRecord[];
  courses: AdminCourse[];
  progressByLearner: Record<string, Record<string, CourseProgress>>;
}) {
  const [search, setSearch] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'learner', desc: false }]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const rows: LearnerRow[] = React.useMemo(
    () =>
      learners.map((learner) => {
        const progress = progressByLearner[learner.id] ?? {};
        const enrolledCount = courses.filter((c) => progress[c.id]?.enrolled).length;
        const pendingCount = courses.filter(
          (c) => getCourseStatus(c, progress[c.id]) === 'pending-verification',
        ).length;
        return { learner, enrolledCount, totalCourses: courses.length, pendingCount };
      }),
    [learners, courses, progressByLearner],
  );

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.learner.name.toLowerCase().includes(query) ||
        row.learner.email.toLowerCase().includes(query),
    );
  }, [rows, search]);

  const table = useTable({
    features: adminTableFeatures,
    data: filteredRows,
    columns,
    state: { sorting, pagination },
    getRowId: (row) => row.learner.id,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search learners..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.setPageIndex(0);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/15">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-11 p-3 font-medium">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="relative">
                  {row.getAllCells().map((cell, index) => (
                    <TableCell key={cell.id} className="p-3">
                      <table.FlexRender cell={cell} />
                      {index === 0 && (
                        <Link
                          href={`/admin/learners/${row.original.learner.id}`}
                          className="absolute inset-0"
                          aria-label={`View ${row.original.learner.name}`}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No learners found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {filteredRows.length} learner{filteredRows.length === 1 ? '' : 's'}
        </div>
        <div className="flex w-full items-center gap-6 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-medium">Rows per page</span>
            <Select
              value={`${table.state.pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center text-sm font-medium">
            Page {table.state.pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
