'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@/components/icons';
import { Badge, DataTableCard, DataTableCardHeader, StateCard } from '@/components/ui';
import { NewWorkforceBoardDialog } from '@/components/admin-shell/quick-create/NewWorkforceBoardDialog';
import type { WorkforceBoardSummary } from '@/lib/data/wioa-boards';

export function BoardsAdminView({ boards }: { boards: WorkforceBoardSummary[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

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
        <>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}
          >
            {boards.map((b) => (
              <div key={b.id} className="panel">
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
              </div>
            ))}
          </div>

          <DataTableCard>
            <DataTableCardHeader title="All boards" />
            <table className="data-table">
              <thead>
                <tr>
                  <th>Board</th>
                  <th>County</th>
                  <th>Contact</th>
                  <th>Active cases</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {boards.map((b) => (
                  <tr
                    key={b.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/admin/wioa/boards/${b.id}`)}
                  >
                    <td>{b.name}</td>
                    <td>{b.county}</td>
                    <td>{b.primaryContactName ?? '—'}</td>
                    <td>{b.activeCaseCount}</td>
                    <td>
                      <Badge tone={b.active ? 'success' : 'neutral'}>
                        {b.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableCard>
        </>
      )}

      <NewWorkforceBoardDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
