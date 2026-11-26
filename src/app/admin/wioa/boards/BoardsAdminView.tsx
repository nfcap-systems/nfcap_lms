'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@/components/icons';
import {
  Badge,
  DataTableCard,
  DataTableCardHeader,
  DataTableFilters,
  StateCard,
} from '@/components/ui';
import { NewWorkforceBoardDialog } from '@/components/admin-shell/quick-create/NewWorkforceBoardDialog';
import type { WorkforceBoardSummary } from '@/lib/data/wioa-boards';

type ViewMode = 'table' | 'card';

function toCsv(boards: WorkforceBoardSummary[]): string {
  const header = ['Board', 'County', 'Contact', 'Active cases', 'Status'];
  const rows = boards.map((b) => [
    b.name,
    b.county,
    b.primaryContactName ?? '',
    String(b.activeCaseCount),
    b.active ? 'Active' : 'Inactive',
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function BoardsAdminView({ boards }: { boards: WorkforceBoardSummary[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boards.filter((b) => {
      if (statusFilter === 'active' && !b.active) return false;
      if (statusFilter === 'inactive' && b.active) return false;
      if (
        q &&
        !b.name.toLowerCase().includes(q) &&
        !b.county.toLowerCase().includes(q) &&
        !(b.primaryContactName?.toLowerCase().includes(q) ?? false)
      )
        return false;
      return true;
    });
  }, [boards, search, statusFilter]);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workforce-boards-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>WIOA — Workforce Boards</h1>
          <p>Workforce development boards configured for automatic learner matching by address.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <button type="button" className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            + Add board
          </button>
        </div>
      </div>

      {boards.length === 0 ? (
        <StateCard
          icon={<Icon name="briefcase" className="h-5 w-5" />}
          title="No workforce boards yet"
          description="Add one to start routing learners by ZIP."
        />
      ) : (
        <DataTableCard>
          <DataTableCardHeader
            title="All boards"
            description={`${filtered.length} of ${boards.length} board${boards.length === 1 ? '' : 's'}`}
            actions={
              <>
                <div className="dtsearch">
                  <Icon name="search" className="h-3.5 w-3.5" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search boards..."
                    aria-label="Search boards"
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
                <span className="lbl">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="viewtoggle">
              <button
                type="button"
                className={view === 'table' ? 'on' : undefined}
                aria-label="Table view"
                aria-pressed={view === 'table'}
                onClick={() => setView('table')}
              >
                <Icon name="list" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={view === 'card' ? 'on' : undefined}
                aria-label="Card view"
                aria-pressed={view === 'card'}
                onClick={() => setView('card')}
              >
                <Icon name="grid" className="h-3.5 w-3.5" />
              </button>
            </div>
          </DataTableFilters>

          {filtered.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                fontSize: 13.5,
                color: 'var(--ink-muted)',
              }}
            >
              No boards match this filter.
            </div>
          ) : view === 'table' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Board</th>
                  <th>County</th>
                  <th>Contact</th>
                  <th>Active cases</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{b.county}</td>
                    <td>{b.primaryContactName ?? '—'}</td>
                    <td>{b.activeCaseCount}</td>
                    <td>
                      <Badge tone={b.active ? 'success' : 'neutral'}>
                        {b.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="rowkebab"
                        aria-label={`View ${b.name}`}
                        onClick={() => router.push(`/admin/wioa/boards/${b.id}`)}
                      >
                        <Icon name="chevron-right" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 16,
                padding: 16,
              }}
            >
              {filtered.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className="panel"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => router.push(`/admin/wioa/boards/${b.id}`)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>{b.name}</span>
                    <Badge tone={b.active ? 'success' : 'neutral'}>
                      {b.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                    County: {b.county}
                    <br />
                    Contact: {b.primaryContactName ?? '—'}
                    <br />
                    {b.activeCaseCount} active case{b.activeCaseCount === 1 ? '' : 's'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </DataTableCard>
      )}

      <NewWorkforceBoardDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
