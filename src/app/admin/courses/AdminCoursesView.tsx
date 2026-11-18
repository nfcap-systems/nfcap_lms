'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  Plus,
  Search,
} from 'lucide-react';

import { setCoursePublished } from '@/lib/actions/courses';
import { courseLessonCount } from '@/lib/types';
import type { AdminCourse } from '@/lib/data/courses';
import { adminTableFeatures, type AdminTableFeatures } from '@/lib/admin-table-features';
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
import { NewCourseDialog } from '@/components/admin-shell/quick-create/NewCourseDialog';

const columns: ColumnDef<AdminTableFeatures, AdminCourse>[] = [
  {
    accessorKey: 'title',
    header: 'Course',
    sortFn: 'alphanumeric',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {row.original.title}
            </span>
            {row.original.access === 'restricted' && (
              <Lock className="size-3 shrink-0 text-muted-foreground" />
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">{row.original.category}</span>
        </div>
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.published ? 'success' : 'outline'}>
        {row.original.published ? 'Published' : 'Unpublished'}
      </Badge>
    ),
  },
  {
    id: 'sections',
    header: 'Sections',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.sections.length}</span>
    ),
  },
  {
    id: 'lessons',
    header: 'Lessons',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{courseLessonCount(row.original)}</span>
    ),
  },
];

export function AdminCoursesView({ courses }: { courses: AdminCourse[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const sorted = React.useMemo(
    () => [...courses].sort((a, b) => a.pathwayOrder - b.pathwayOrder),
    [courses],
  );

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter(
      (c) => c.title.toLowerCase().includes(query) || c.category.toLowerCase().includes(query),
    );
  }, [sorted, search]);

  function togglePublished(course: AdminCourse) {
    startTransition(async () => {
      await setCoursePublished(course.id, !course.published);
      router.refresh();
    });
  }

  const table = useTable({
    features: adminTableFeatures,
    data: filtered,
    columns,
    state: { sorting, pagination },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All courses in the apprenticeship program. Open a course to manage its sections,
            lessons, and knowledge assessment in the Curriculum Builder.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add course
        </Button>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search courses..."
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
                <TableHead className="h-11 p-3 font-medium">Actions</TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="p-3">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                  <TableCell className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/courses/${row.original.id}`)}
                      >
                        Edit curriculum
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePublished(row.original)}
                      >
                        {row.original.published ? 'Unpublish' : 'Publish'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  No courses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {filtered.length} course{filtered.length === 1 ? '' : 's'}
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

      <NewCourseDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
