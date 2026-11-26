'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import {
  Badge,
  DataTableCard,
  DataTableCardHeader,
  DataTableFilters,
  RowActionsMenu,
  StateCard,
} from '@/components/ui';
import { DropdownMenuItem } from '@/components/admin-ui/dropdown-menu';
import type { StatusTone } from '@/components/ui/Badge';
import type { StalledCase } from '@/lib/data/wioa';
import { WIOA_STATUS_LABEL, WIOA_STATUS_PHASE, type WioaUiPhase } from '@/lib/wioa/status';

const PHASE_TONE: Record<WioaUiPhase, StatusTone> = {
  Registration: 'neutral',
  Matching: 'neutral',
  Contact: 'pending',
  'Eligibility Process': 'pending',
  Closed: 'danger',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function toCsv(cases: StalledCase[]): string {
  const header = ['Learner', 'Workforce board', 'Status', 'Stalled since (days)', 'Likely cause'];
  const rows = cases.map((c) => [
    c.learnerName,
    c.boardName ?? '',
    WIOA_STATUS_LABEL[c.status],
    String(c.daysStalled),
    c.likelyCause,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function StalledCasesView({
  cases,
  totalCaseCount,
}: {
  cases: StalledCase[];
  totalCaseCount: number;
}) {
  const router = useRouter();
  const [boardFilter, setBoardFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const boards = useMemo(
    () => Array.from(new Set(cases.map((c) => c.boardName).filter((b): b is string => !!b))).sort(),
    [cases],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (boardFilter !== 'all' && c.boardName !== boardFilter) return false;
      if (q && !c.learnerName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, boardFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const pageRows = filtered.slice((page - 1) * 10, page * 10);

  const longestStalled = cases[0]?.daysStalled ?? 0;
  const pctOfTotal =
    totalCaseCount === 0 ? 0 : Math.round((cases.length / totalCaseCount) * 100 * 10) / 10;

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stalled-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (cases.length === 0) {
    return (
      <StateCard
        icon={<Icon name="check" className="h-5 w-5" />}
        title="No stalled cases"
        description="Every case has had a status change in the last 14 days."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <div className="mcard">
          <div
            className="ic"
            style={{ background: 'var(--status-problem-bg)', color: 'var(--status-problem)' }}
          >
            <Icon name="alert-circle" className="h-4 w-4" />
          </div>
          <span className="l">Stalled cases</span>
          <span className="n">{cases.length}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="clock" className="h-4 w-4" />
          </div>
          <span className="l">Longest stalled</span>
          <span className="n">{longestStalled} days</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="clipboard" className="h-4 w-4" />
          </div>
          <span className="l">Of {totalCaseCount} total cases</span>
          <span className="n">{pctOfTotal}%</span>
        </div>
      </div>

      <DataTableCard>
        <DataTableCardHeader
          title="Stalled cases"
          description="No status change in 14 or more days — a pre-filtered view of All Cases, not a separate dataset."
          actions={
            <>
              <div className="dtsearch">
                <Icon name="search" className="h-3.5 w-3.5" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search cases..."
                  aria-label="Search stalled cases"
                />
              </div>
              <button type="button" className="dtbtn" onClick={exportCsv}>
                <Icon name="upload" className="h-3.5 w-3.5" />
                Export
              </button>
            </>
          }
        />

        <DataTableFilters>
          <div className="dt-filter-group">
            <div className="dt-filter">
              <span className="lbl">Workforce board:</span>
              <select
                value={boardFilter}
                onChange={(e) => {
                  setBoardFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                {boards.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="dt-filter">
              <span className="lbl">Threshold:</span> 14+ days
            </div>
          </div>
        </DataTableFilters>

        <table className="data-table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Workforce board</th>
              <th>Status</th>
              <th>Stalled since</th>
              <th>Likely cause</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => {
              const phase = WIOA_STATUS_PHASE[c.status];
              return (
                <tr key={c.id}>
                  <td>
                    <div className="rowname">
                      <div className="av-wrap">
                        <div className="av">{initials(c.learnerName)}</div>
                      </div>
                      <div>
                        <div>{c.learnerName}</div>
                        <div className="meta">{c.courseTitle}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="rowboard">{c.boardName ?? 'No workforce board matched'}</div>
                  </td>
                  <td>
                    <Badge tone={PHASE_TONE[phase]}>{WIOA_STATUS_LABEL[c.status]}</Badge>
                  </td>
                  <td>
                    <span className="stalled-tag">{c.daysStalled} days</span>
                  </td>
                  <td>{c.likelyCause}</td>
                  <td style={{ textAlign: 'right' }}>
                    <RowActionsMenu label={`Actions for ${c.learnerName}`}>
                      <DropdownMenuItem onSelect={() => router.push(`/coordinator/${c.id}`)}>
                        <Icon name="chevron-right" className="h-4 w-4" />
                        View case
                      </DropdownMenuItem>
                    </RowActionsMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="dt-footer">
          <span>
            Showing {pageRows.length} of {filtered.length}
          </span>
          <span>
            Page {page} of {pageCount}
          </span>
        </div>
      </DataTableCard>

      {pageCount > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          <button
            type="button"
            className="dtbtn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="dtbtn"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
