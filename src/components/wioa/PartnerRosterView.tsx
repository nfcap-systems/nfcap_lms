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
  Dialog,
  RowActionsMenu,
  StateCard,
  Textarea,
} from '@/components/ui';
import { DropdownMenuItem } from '@/components/admin-ui/dropdown-menu';
import { Icon } from '@/components/icons';
import type { WioaCaseSummary } from '@/lib/data/wioa';
import { addWioaCaseNote, sendWioaCaseReminder } from '@/lib/actions/wioa';

/** A trainee's real position in the single apprenticeship pathway (docs/product/PRODUCT_CONTEXT.md
 * Section 5 — "exactly one pathway in this prototype"), computed from real Enrollment rows the
 * same way src/lib/data/pathway.ts does, not fabricated per-row. */
export type PartnerRosterRow = WioaCaseSummary & {
  enrolledCount: number;
  totalCourseCount: number;
  cohortName: string | null;
};

type DocumentFilter = 'all' | 'missing' | 'on_track';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** EMAIL communications store their full HTML body (e.g. sendWioaCaseReminder's `<p>...</p>`
 * reminder text in src/lib/actions/wioa.ts) — strip tags before showing a plain-text snippet. */
function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatFollowUp(followUp: WioaCaseSummary['lastFollowUp']): string {
  if (!followUp) return 'No note yet';
  const date = new Date(followUp.sentAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const body = followUp.body ? stripHtml(followUp.body) : '';
  const snippet = body ? ` — "${body.slice(0, 60)}${body.length > 60 ? '…' : ''}"` : '';
  return `${date}${snippet}`;
}

const WEEK_MS = 7 * 86_400_000;

function toCsv(rows: PartnerRosterRow[]): string {
  const header = [
    'Trainee',
    'Email',
    'Pathway',
    'Cohort',
    'Progress',
    'Missing documents',
    'Last follow-up',
  ];
  const csvRows = rows.map((r) => [
    r.learnerName,
    r.learnerEmail,
    r.courseTitle ?? '',
    r.cohortName ?? '',
    `${r.enrolledCount} of ${r.totalCourseCount} enrolled`,
    String(r.missingDocumentCount),
    formatFollowUp(r.lastFollowUp),
  ]);
  return [header, ...csvRows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function PartnerRosterView({ rows }: { rows: PartnerRosterRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [docFilter, setDocFilter] = useState<DocumentFilter>('all');
  const [page, setPage] = useState(1);
  const [noteFor, setNoteFor] = useState<PartnerRosterRow | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (docFilter === 'missing' && r.missingDocumentCount === 0) return false;
      if (docFilter === 'on_track' && r.missingDocumentCount > 0) return false;
      if (
        q &&
        !r.learnerName.toLowerCase().includes(q) &&
        !(r.courseTitle?.toLowerCase().includes(q) ?? false)
      )
        return false;
      return true;
    });
  }, [rows, docFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const pageRows = filtered.slice((page - 1) * 10, page * 10);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sendReminder(row: PartnerRosterRow) {
    setSendingReminderId(row.id);
    sendWioaCaseReminder(row.id)
      .then(() => router.refresh())
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Could not send reminder.'))
      .finally(() => setSendingReminderId(null));
  }

  const [now] = useState(() => Date.now());
  const kpis = useMemo(() => {
    return {
      assigned: rows.length,
      missingDocuments: rows.reduce((sum, r) => sum + r.missingDocumentCount, 0),
      onTrack: rows.filter((r) => r.missingDocumentCount === 0).length,
      followUpsThisWeek: rows.filter(
        (r) => r.lastFollowUp && now - new Date(r.lastFollowUp.sentAt).getTime() < WEEK_MS,
      ).length,
    };
  }, [rows, now]);

  if (rows.length === 0) {
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
            <Icon name="users" className="h-4 w-4" />
          </div>
          <span className="l">Assigned trainees</span>
          <span className="n">{kpis.assigned}</span>
        </div>
        <div className="mcard">
          <div
            className="ic"
            style={{ background: 'var(--status-problem-bg)', color: 'var(--status-problem)' }}
          >
            <Icon name="file-text" className="h-4 w-4" />
          </div>
          <span className="l">Missing documents</span>
          <span className="n">{kpis.missingDocuments}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="check" className="h-4 w-4" />
          </div>
          <span className="l">On track</span>
          <span className="n">{kpis.onTrack}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="clock" className="h-4 w-4" />
          </div>
          <span className="l">Follow-ups this week</span>
          <span className="n">{kpis.followUpsThisWeek}</span>
        </div>
      </div>

      <DataTableCard>
        <DataTableCardHeader
          title="My cases"
          description="Only trainees assigned to you — not every case in the system."
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
                  placeholder="Search trainees..."
                  aria-label="Search trainees"
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
              <span className="lbl">Documents:</span>
              <select
                value={docFilter}
                onChange={(e) => {
                  setDocFilter(e.target.value as DocumentFilter);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="missing">Missing</option>
                <option value="on_track">On track</option>
              </select>
            </div>
          </div>
        </DataTableFilters>

        <table className="data-table">
          <thead>
            <tr>
              <th>Trainee</th>
              <th>Pathway / cohort</th>
              <th>Progress</th>
              <th>Missing documents</th>
              <th>Last follow-up</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              return (
                <tr key={r.id}>
                  <td>
                    <Link href={`/partner/${r.id}`} className="rowname">
                      <div className="av-wrap">
                        <div className="av">{initials(r.learnerName)}</div>
                      </div>
                      <div>
                        <div>{r.learnerName}</div>
                        <div className="meta">{r.learnerEmail}</div>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <div className="rowpathway">
                      {r.courseTitle}
                      <div className="sub">{r.cohortName ?? 'No cohort'}</div>
                    </div>
                  </td>
                  <td>
                    {r.enrolledCount} of {r.totalCourseCount} enrolled
                  </td>
                  <td>
                    {r.missingDocumentCount > 0 ? (
                      <Badge tone="danger">
                        {r.missingDocumentCount} document{r.missingDocumentCount === 1 ? '' : 's'}{' '}
                        missing
                      </Badge>
                    ) : (
                      <Badge tone="success">All submitted</Badge>
                    )}
                  </td>
                  <td
                    style={{
                      maxWidth: 260,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={formatFollowUp(r.lastFollowUp)}
                  >
                    {formatFollowUp(r.lastFollowUp)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <RowActionsMenu label={`Actions for ${r.learnerName}`}>
                      <DropdownMenuItem onSelect={() => router.push(`/partner/${r.id}`)}>
                        <Icon name="chevron-right" className="h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      {r.missingDocumentCount > 0 && (
                        <DropdownMenuItem
                          onSelect={() => sendReminder(r)}
                          disabled={sendingReminderId === r.id}
                        >
                          <Icon name="mail" className="h-4 w-4" />
                          {sendingReminderId === r.id ? 'Sending…' : 'Send reminder'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setNoteFor(r)}>
                        <Icon name="message-circle" className="h-4 w-4" />
                        Add note
                      </DropdownMenuItem>
                    </RowActionsMenu>
                  </td>
                </tr>
              );
            })}
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
            No trainees match this search.
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

      <AddNoteDialog row={noteFor} onClose={() => setNoteFor(null)} />
    </div>
  );
}

function AddNoteDialog({ row, onClose }: { row: PartnerRosterRow | null; onClose: () => void }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!row || !body.trim()) return;
    setSaving(true);
    await addWioaCaseNote(row.id, body.trim());
    setSaving(false);
    setBody('');
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={!!row}
      onClose={onClose}
      title={row ? `Add a note — ${row.learnerName}` : undefined}
      description="Internal follow-up note, not sent to the trainee."
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={saving || !body.trim()}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </>
      }
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="e.g. Left a voicemail, will follow up Friday"
        style={{ minHeight: 90 }}
      />
    </Dialog>
  );
}
