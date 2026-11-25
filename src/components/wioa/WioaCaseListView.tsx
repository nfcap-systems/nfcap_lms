'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Badge,
  DataTableCard,
  DataTableCardHeader,
  DataTableFilters,
  StateCard,
} from '@/components/ui';
import type { StatusTone } from '@/components/ui/Badge';
import { Icon } from '@/components/icons';
import type { WioaCaseSummary } from '@/lib/data/wioa';
import type { LearnerRecord } from '@/lib/data/learners';
import {
  WIOA_STATUS_LABEL,
  WIOA_STATUS_PHASE,
  WIOA_UI_PHASES,
  type WioaUiPhase,
} from '@/lib/wioa/status';
import { assignWioaCasePartnerStaff } from '@/lib/actions/wioa';

type PhaseFilter = 'all' | WioaUiPhase;

const PHASE_TONE: Record<WioaUiPhase, StatusTone> = {
  Registration: 'neutral',
  Matching: 'neutral',
  Contact: 'pending',
  'Eligibility Process': 'pending',
  Closed: 'danger',
};

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  ORIENTATION: 'Orientation',
  INTAKE: 'Intake',
  FOLLOWUP: 'Follow-up',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function daysInStatus(lastStatusChangeAt: Date): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(lastStatusChangeAt).getTime()) / 86_400_000),
  );
}

const STALL_THRESHOLD_DAYS = 14;
function isStalled(c: WioaCaseSummary): boolean {
  return daysInStatus(c.lastStatusChangeAt) >= STALL_THRESHOLD_DAYS;
}

function formatAppointment(appt: WioaCaseSummary['nextAppointment']): string {
  if (!appt) return '—';
  const date = new Date(appt.scheduledAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${date} · ${APPOINTMENT_TYPE_LABEL[appt.type] ?? appt.type}`;
}

function toCsv(cases: WioaCaseSummary[]): string {
  const header = [
    'Learner',
    'Course',
    'Workforce board',
    'Phase',
    'Status',
    'Time in status (days)',
    'Next appointment',
  ];
  const rows = cases.map((c) => [
    c.learnerName,
    c.courseTitle ?? '',
    c.boardName ?? '',
    WIOA_STATUS_PHASE[c.status],
    WIOA_STATUS_LABEL[c.status],
    String(daysInStatus(c.lastStatusChangeAt)),
    formatAppointment(c.nextAppointment),
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function WioaCaseListView({
  cases,
  basePath,
  partnerStaffRoster,
}: {
  cases: WioaCaseSummary[];
  /** '/coordinator' or '/partner' — case detail links and assignment revalidation target. */
  basePath: '/coordinator' | '/partner';
  /** Only passed on the Coordinator dashboard — presence of this prop is what turns on the
   * assignment dropdown (Partner Staff never assigns, only views their own assignment). */
  partnerStaffRoster?: LearnerRecord[];
}) {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [boardFilter, setBoardFilter] = useState<string>('all');
  const [stalledOnly, setStalledOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const boards = useMemo(
    () => Array.from(new Set(cases.map((c) => c.boardName).filter((b): b is string => !!b))).sort(),
    [cases],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (phaseFilter !== 'all' && WIOA_STATUS_PHASE[c.status] !== phaseFilter) return false;
      if (boardFilter !== 'all' && c.boardName !== boardFilter) return false;
      if (stalledOnly && !isStalled(c)) return false;
      if (
        q &&
        !c.learnerName.toLowerCase().includes(q) &&
        !(c.courseTitle?.toLowerCase().includes(q) ?? false)
      )
        return false;
      return true;
    });
  }, [cases, phaseFilter, boardFilter, stalledOnly, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const pageRows = filtered.slice((page - 1) * 10, page * 10);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((c) => selected.has(c.id));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of pageRows) {
        if (allOnPageSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  }

  const [now] = useState(() => Date.now());
  const kpis = useMemo(
    () => ({
      total: cases.length,
      stalled: cases.filter(isStalled).length,
      appointmentsThisWeek: cases.filter(
        (c) =>
          c.nextAppointment &&
          new Date(c.nextAppointment.scheduledAt).getTime() - now < 7 * 86_400_000,
      ).length,
      fundingRequest: cases.filter((c) => c.fundingRequests.length > 0).length,
    }),
    [cases, now],
  );

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wioa-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (cases.length === 0) {
    return (
      <StateCard
        icon={<Icon name="briefcase" className="h-5 w-5" />}
        title="No WIOA cases yet"
        description="Cases open automatically when a learner sends outreach from the Funding page."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <div className="mcard">
          <div className="ic">
            <Icon name="briefcase" className="h-4 w-4" />
          </div>
          <span className="l">Total cases</span>
          <span className="n">{kpis.total}</span>
        </div>
        {basePath === '/coordinator' ? (
          <Link href="/coordinator/stalled" className="mcard" style={{ cursor: 'pointer' }}>
            <div
              className="ic"
              style={{ background: 'var(--status-problem-bg)', color: 'var(--status-problem)' }}
            >
              <Icon name="alert-circle" className="h-4 w-4" />
            </div>
            <span className="l">Stalled (14+ days)</span>
            <span className="n">{kpis.stalled}</span>
          </Link>
        ) : (
          <div className="mcard">
            <div
              className="ic"
              style={{ background: 'var(--status-problem-bg)', color: 'var(--status-problem)' }}
            >
              <Icon name="alert-circle" className="h-4 w-4" />
            </div>
            <span className="l">Stalled (14+ days)</span>
            <span className="n">{kpis.stalled}</span>
          </div>
        )}
        <div className="mcard">
          <div className="ic">
            <Icon name="clipboard" className="h-4 w-4" />
          </div>
          <span className="l">Appointments this week</span>
          <span className="n">{kpis.appointmentsThisWeek}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="clock" className="h-4 w-4" />
          </div>
          <span className="l">In funding request</span>
          <span className="n">{kpis.fundingRequest}</span>
        </div>
      </div>

      <DataTableCard>
        <DataTableCardHeader
          title="All cases"
          description={`Every open and closed WIOA case${boards.length > 0 ? `, across all ${boards.length} workforce boards` : ''}.`}
          actions={
            <>
              <div className="dtsearch">
                <Icon name="search" className="h-3.5 w-3.5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cases..."
                  aria-label="Search cases"
                />
              </div>
              {/* Column hide/customize isn't built — disabled rather than fabricated, same
                  pattern as the Admin Learners roster's own Hide/Customize buttons. */}
              <button type="button" className="dtbtn" disabled title="Not yet built">
                <Icon name="list" className="h-3.5 w-3.5" />
                Hide
              </button>
              <button type="button" className="dtbtn" disabled title="Not yet built">
                <Icon name="settings" className="h-3.5 w-3.5" />
                Customize
              </button>
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
              <span className="lbl">Phase:</span>
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
              >
                <option value="all">All</option>
                {[...WIOA_UI_PHASES, 'Closed' as const].map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </div>
            {boards.length > 0 && (
              <div className="dt-filter">
                <span className="lbl">Workforce board:</span>
                <select value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)}>
                  <option value="all">All</option>
                  {boards.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="button"
            className={stalledOnly ? 'dt-filter toggle-on' : 'dt-filter'}
            onClick={() => {
              setStalledOnly((v) => !v);
              setPage(1);
            }}
          >
            <Icon name="alert-circle" className="h-3 w-3" />
            Stalled only
          </button>
        </DataTableFilters>

        <div className="dt-selrow">
          <span className="dt-selcount">{selected.size} selected</span>
          {/* Grid view isn't built — List stays the only working mode, same honest-disclosure
              pattern used elsewhere (e.g. the Admin Learners roster). */}
          <div className="viewtoggle">
            <button type="button" className="on" aria-label="List view">
              <Icon name="list" className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Grid view" disabled title="Not yet built">
              <Icon name="grid" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th className="tcol-check">
                <span
                  className="tcheck"
                  aria-label="Select all"
                  role="checkbox"
                  aria-checked={allOnPageSelected}
                  tabIndex={0}
                  onClick={toggleAllOnPage}
                  onKeyDown={(e) => e.key === 'Enter' && toggleAllOnPage()}
                  style={allOnPageSelected ? { background: 'var(--nfcap-accent)' } : undefined}
                />
              </th>
              <th>Case</th>
              <th>Workforce board</th>
              <th>Status</th>
              {partnerStaffRoster && <th>Assigned to</th>}
              <th>Next appointment</th>
              <th>Time in status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <CaseRow
                key={c.id}
                c={c}
                basePath={basePath}
                partnerStaffRoster={partnerStaffRoster}
                selected={selected.has(c.id)}
                onToggleSelect={() => toggleRow(c.id)}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              fontSize: 13.5,
              color: 'var(--ink-muted)',
            }}
          >
            No cases match this filter.
          </div>
        ) : (
          <div className="dt-footer">
            <span>
              Showing {pageRows.length} of {filtered.length}
            </span>
            <span>
              Page {page} of {pageCount}
            </span>
          </div>
        )}
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

function CaseRow({
  c,
  basePath,
  partnerStaffRoster,
  selected,
  onToggleSelect,
}: {
  c: WioaCaseSummary;
  basePath: '/coordinator' | '/partner';
  partnerStaffRoster?: LearnerRecord[];
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const phase = WIOA_STATUS_PHASE[c.status];

  async function assign(partnerStaffId: string) {
    setAssigning(true);
    try {
      await assignWioaCasePartnerStaff(c.id, partnerStaffId || null);
      toast.success(partnerStaffId ? 'Case assigned' : 'Case unassigned');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update the assignment.');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <tr>
      <td className="tcol-check">
        <span
          className="tcheck"
          aria-label={`Select ${c.learnerName}`}
          role="checkbox"
          aria-checked={selected}
          tabIndex={0}
          onClick={onToggleSelect}
          onKeyDown={(e) => e.key === 'Enter' && onToggleSelect()}
          style={selected ? { background: 'var(--nfcap-accent)' } : undefined}
        />
      </td>
      <td>
        <Link href={`${basePath}/${c.id}`} className="rowname">
          <div className="av-wrap">
            <div className="av">{initials(c.learnerName)}</div>
          </div>
          <div>
            <div>{c.learnerName}</div>
            <div className="meta">{c.courseTitle}</div>
          </div>
        </Link>
      </td>
      <td>
        <div className="rowboard">{c.boardName ?? 'No workforce board matched'}</div>
      </td>
      <td>
        <div className="rowstatus">
          <Badge tone={PHASE_TONE[phase]}>{phase}</Badge>
          <div className="sub">{WIOA_STATUS_LABEL[c.status]}</div>
        </div>
      </td>
      {partnerStaffRoster && (
        <td>
          <select
            value={c.assignedPartnerStaffId ?? ''}
            disabled={assigning}
            onChange={(e) => assign(e.target.value)}
            style={{
              height: 30,
              border: '1px solid var(--nfcap-border)',
              borderRadius: 'var(--nfcap-radius-md)',
              fontSize: 12.5,
              padding: '0 6px',
              color: 'var(--ink)',
              background: 'var(--surface)',
            }}
          >
            <option value="">Unassigned</option>
            {partnerStaffRoster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </td>
      )}
      <td>{formatAppointment(c.nextAppointment)}</td>
      <td>
        {isStalled(c) ? (
          <span className="stalled-tag">
            <Icon name="alert-circle" className="h-3 w-3" />
            {daysInStatus(c.lastStatusChangeAt)} days — stalled
          </span>
        ) : (
          `${daysInStatus(c.lastStatusChangeAt)} days`
        )}
      </td>
      <td style={{ textAlign: 'right' }}>
        <Link href={`${basePath}/${c.id}`} className="rowkebab" aria-label="View case">
          <Icon name="chevron-right" className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}
