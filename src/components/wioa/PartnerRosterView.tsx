'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, DataTableCard, DataTableCardHeader, Dialog, StateCard, Textarea } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { WioaCaseSummary } from '@/lib/data/wioa';
import { addWioaCaseNote } from '@/lib/actions/wioa';

/** A trainee's real position in the single apprenticeship pathway (docs/product/PRODUCT_CONTEXT.md
 * Section 5 — "exactly one pathway in this prototype"), computed from real Enrollment rows the
 * same way src/lib/data/pathway.ts does, not fabricated per-row. */
export type PartnerRosterRow = WioaCaseSummary & {
  enrolledCount: number;
  totalCourseCount: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function formatFollowUp(followUp: WioaCaseSummary['lastFollowUp']): string {
  if (!followUp) return 'No note yet';
  const date = new Date(followUp.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const snippet = followUp.body ? ` — "${followUp.body.slice(0, 60)}${followUp.body.length > 60 ? '…' : ''}"` : '';
  return `${date}${snippet}`;
}

const WEEK_MS = 7 * 86_400_000;

export function PartnerRosterView({ rows }: { rows: PartnerRosterRow[] }) {
  const [search, setSearch] = useState('');
  const [noteFor, setNoteFor] = useState<PartnerRosterRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.learnerName.toLowerCase().includes(q) || r.courseTitle.toLowerCase().includes(q),
    );
  }, [rows, search]);

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
          <div className="ic" style={{ background: 'var(--status-problem-bg)', color: 'var(--status-problem)' }}>
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
            <div className="dtsearch">
              <Icon name="search" className="h-3.5 w-3.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trainees..."
                aria-label="Search trainees"
              />
            </div>
          }
        />

        <table className="data-table">
          <thead>
            <tr>
              <th>Trainee</th>
              <th>Course</th>
              <th>Progress</th>
              <th>Missing documents</th>
              <th>Last follow-up</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
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
                  <div className="rowpathway">{r.courseTitle}</div>
                </td>
                <td>
                  {r.enrolledCount} of {r.totalCourseCount} enrolled
                </td>
                <td>
                  {r.missingDocumentCount > 0 ? (
                    <Badge tone="danger">
                      {r.missingDocumentCount} document{r.missingDocumentCount === 1 ? '' : 's'} missing
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
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                    <button type="button" className="dtbtn" onClick={() => setNoteFor(r)}>
                      Add note
                    </button>
                    <Link href={`/partner/${r.id}`} className="dtbtn">
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13.5, color: 'var(--ink-muted)' }}>
            No trainees match this search.
          </div>
        ) : (
          <div className="dt-footer">
            <span className="dt-selcount">
              {filtered.length} of {rows.length} trainee{rows.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </DataTableCard>

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
          <button type="button" className="btn-primary btn-sm" disabled={saving || !body.trim()} onClick={save}>
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
