'use client';

import * as React from 'react';
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
  Download,
  Search,
} from 'lucide-react';

import type { AuditLogEntry } from '@/lib/actions/audit';
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

function toCsv(entries: AuditLogEntry[]): string {
  const header = [
    'createdAt',
    'actorId',
    'actorRole',
    'action',
    'targetType',
    'targetId',
    'metadata',
  ];
  const rows = entries.map((e) =>
    [
      e.createdAt.toISOString(),
      e.actorId,
      e.actorRole,
      e.action,
      e.targetType,
      e.targetId ?? '',
      e.metadata ? JSON.stringify(e.metadata) : '',
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

function downloadCsv(entries: AuditLogEntry[]) {
  const csv = toCsv(entries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const columns: ColumnDef<AdminTableFeatures, AuditLogEntry>[] = [
  {
    accessorKey: 'createdAt',
    header: 'When',
    sortFn: 'datetime',
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap text-muted-foreground">
        {row.original.createdAt.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    sortFn: 'alphanumeric',
    cell: ({ row }) => (
      <span className="text-sm font-medium text-foreground">{row.original.action}</span>
    ),
  },
  {
    id: 'actor',
    header: 'Actor',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline">{row.original.actorRole}</Badge>
        <span className="truncate text-xs text-muted-foreground">{row.original.actorId}</span>
      </div>
    ),
  },
  {
    id: 'target',
    header: 'Target',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.targetType}
        {row.original.targetId ? ` #${row.original.targetId}` : ''}
      </span>
    ),
  },
];

export function AuditLogView({ entries }: { entries: AuditLogEntry[] }) {
  const [search, setSearch] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter(
      (e) =>
        e.action.toLowerCase().includes(query) ||
        e.actorId.toLowerCase().includes(query) ||
        e.actorRole.toLowerCase().includes(query) ||
        e.targetType.toLowerCase().includes(query),
    );
  }, [entries, search]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search audit log..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              table.setPageIndex(0);
            }}
          />
        </div>
        <Button variant="outline" onClick={() => downloadCsv(filtered)}>
          <Download className="size-4" />
          Export CSV
        </Button>
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
                <React.Fragment key={row.id}>
                  <TableRow
                    className={row.original.metadata != null ? 'cursor-pointer' : undefined}
                    onClick={() =>
                      row.original.metadata != null &&
                      setExpanded(expanded === row.id ? null : row.id)
                    }
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id} className="p-3">
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                  {expanded === row.id && row.original.metadata != null && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="bg-muted/20 p-3">
                        <pre className="overflow-x-auto text-xs text-muted-foreground">
                          {JSON.stringify(row.original.metadata, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No activity yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
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
                {[20, 50, 100].map((size) => (
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
