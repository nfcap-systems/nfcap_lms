'use client';

import { Fragment, useMemo, useState } from 'react';

import type { AuditLogEntry } from '@/lib/actions/audit';
import { Badge, Pagination, StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';

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

function actionTone(action: string): 'success' | 'pending' | 'danger' | 'info' | 'neutral' {
  if (action.includes('approved') || action.includes('Funded')) return 'success';
  if (action.includes('rejected')) return 'danger';
  if (action.includes('pending')) return 'pending';
  return 'neutral';
}

const PAGE_SIZE = 20;

export function AuditLogView({ entries }: { entries: AuditLogEntry[] }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const [expanded, setExpanded] = useState<string | null>(null);

  const actionTypes = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const cutoff = dateRange === 'all' ? null : now - (dateRange === '7d' ? 7 : 30) * 86_400_000;
    return entries.filter((e) => {
      if (actionFilter !== 'all' && e.action !== actionFilter) return false;
      if (cutoff !== null && e.createdAt.getTime() < cutoff) return false;
      if (!query) return true;
      return (
        e.action.toLowerCase().includes(query) ||
        e.actorId.toLowerCase().includes(query) ||
        e.actorRole.toLowerCase().includes(query) ||
        e.targetType.toLowerCase().includes(query)
      );
    });
  }, [entries, search, actionFilter, dateRange, now]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (entries.length === 0) {
    return (
      <StateCard
        icon={<Icon name="file-text" className="h-5 w-5" />}
        title="No activity yet"
        description="Staff and system actions will appear here as they happen."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Audit Log</h1>
          <p>
            Who did what, and when — funding document views, evidence/document review decisions,
            WIOA case status changes, and course-unlock grants.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => downloadCsv(filtered)}
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="dtsearch" style={{ flex: '1', maxWidth: 300 }}>
          <Icon name="search" className="h-3.5 w-3.5" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search actor or action..."
            aria-label="Search audit log"
          />
        </div>
        <select
          className="field-select"
          style={{ width: 200, height: 36 }}
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by action type"
        >
          <option value="all">Any action type</option>
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <select
          className="field-select"
          style={{ width: 160, height: 36 }}
          value={dateRange}
          onChange={(e) => {
            setDateRange(e.target.value as '7d' | '30d' | 'all');
            setPage(1);
          }}
          aria-label="Filter by date range"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="panel" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}
                >
                  No entries match this search.
                </td>
              </tr>
            ) : (
              pageRows.map((entry) => (
                <Fragment key={entry.id}>
                  <tr
                    style={entry.metadata != null ? { cursor: 'pointer' } : undefined}
                    onClick={() =>
                      entry.metadata != null && setExpanded(expanded === entry.id ? null : entry.id)
                    }
                  >
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-muted)' }}>
                      {entry.createdAt.toLocaleString()}
                    </td>
                    <td>
                      <Badge tone="neutral">{entry.actorRole}</Badge>{' '}
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {entry.actorId}
                      </span>
                    </td>
                    <td>
                      <Badge tone={actionTone(entry.action)}>{entry.action}</Badge>
                    </td>
                    <td style={{ color: 'var(--ink-muted)' }}>
                      {entry.targetType}
                      {entry.targetId ? ` #${entry.targetId}` : ''}
                    </td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: 12.5 }}>
                      {entry.metadata != null
                        ? expanded === entry.id
                          ? 'Hide details'
                          : 'View details'
                        : '—'}
                    </td>
                  </tr>
                  {expanded === entry.id && entry.metadata != null && (
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--surface-muted)' }}>
                        <pre
                          style={{
                            overflowX: 'auto',
                            fontSize: 12,
                            color: 'var(--ink-muted)',
                            margin: 0,
                            padding: '8px 4px',
                          }}
                        >
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
        <div className="table-footer">
          <span>
            Showing {pageRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {(page - 1) * PAGE_SIZE + pageRows.length} of {filtered.length}
          </span>
          <span>
            Page {page} of {pageCount}
          </span>
        </div>
      </div>

      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
}
