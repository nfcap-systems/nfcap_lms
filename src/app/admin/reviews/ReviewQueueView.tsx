'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';
import { bulkApproveEvidence } from '@/lib/actions/progress';
import { timeAgo } from '@/lib/time-ago';

export type ReviewQueueRow = {
  evidenceId: string;
  learnerId: string;
  learnerName: string;
  /** AdminCourse.id is the course slug (src/lib/data/courses.ts) — this is what
   * setEvidenceStatus/bulkApproveEvidence expect as `courseSlug`. */
  courseId: string;
  courseTitle: string;
  submittedAt: string;
  hasFile: boolean;
};

type SortOrder = 'oldest' | 'newest';

export function ReviewQueueView({
  rows,
  approvedToday,
  rejectedToday,
}: {
  rows: ReviewQueueRow[];
  approvedToday: number;
  rejectedToday: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortOrder>('oldest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Outcome of the last bulk approve — feature #7's gated certification means some rows can be
   * refused, and that has to be shown here rather than thrown (feature #12). */
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) seen.set(row.courseId, row.courseTitle);
    return Array.from(seen, ([courseId, courseTitle]) => ({ courseId, courseTitle }));
  }, [rows]);

  const filtered = useMemo(() => {
    const byCourse =
      courseFilter === 'all' ? rows : rows.filter((r) => r.courseId === courseFilter);
    const sorted = [...byCourse].sort((a, b) => {
      const diff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      return sort === 'oldest' ? diff : -diff;
    });
    return sorted;
  }, [rows, courseFilter, sort]);

  const oldestAge = rows.length > 0 ? timeAgo(rows[0].submittedAt) : null;

  function toggleRow(evidenceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(evidenceId)) next.delete(evidenceId);
      else next.add(evidenceId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.evidenceId)),
    );
  }

  function bulkApprove() {
    const selectedRows = filtered.filter((r) => selected.has(r.evidenceId));
    const items = selectedRows.map((r) => ({ learnerId: r.learnerId, courseSlug: r.courseId }));
    if (items.length === 0) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await bulkApproveEvidence(items);
        setSelected(new Set());
        if (result.skipped.length === 0) {
          setNotice({
            tone: 'ok',
            text: `Approved ${result.approved} submission${result.approved === 1 ? '' : 's'}.`,
          });
        } else {
          const names = result.skipped
            .map((s) => {
              const row = selectedRows.find(
                (r) => r.learnerId === s.learnerId && r.courseId === s.courseSlug,
              );
              return row ? `${row.learnerName} — ${row.courseTitle}` : s.courseSlug;
            })
            .join('; ');
          setNotice({
            tone: 'warn',
            text:
              `Approved ${result.approved} of ${items.length}. ` +
              `Needs per-criterion review before it can be certified: ${names}.`,
          });
        }
        router.refresh();
      } catch (e) {
        setNotice({
          tone: 'warn',
          text: e instanceof Error ? e.message : 'Bulk approve failed.',
        });
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pagehdr">
          <div>
            <h1>Review Queue</h1>
            <p>Every submission awaiting assessment, oldest first.</p>
          </div>
        </div>
        {/* A bulk approve that clears the whole queue lands here, so the outcome has to render on
            this branch too or it is never seen. */}
        {notice && <div className="callout">{notice.text}</div>}
        <StateCard
          icon={<Icon name="check" className="h-5 w-5" />}
          title="Nothing waiting for review"
          description="Every submission has been assessed. New practical-evidence submissions will show up here, oldest first, as trainees complete their courses."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Review Queue</h1>
          <p>Evidence awaiting staff review</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={selected.size === 0 || isPending}
            onClick={bulkApprove}
          >
            {isPending
              ? 'Approving…'
              : `Bulk approve${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className="callout"
          style={
            notice.tone === 'warn'
              ? { borderColor: 'var(--status-problem-border)', color: 'var(--status-problem)' }
              : undefined
          }
        >
          {notice.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <div className="mcard">
          <div className="ic">
            <Icon name="check" className="h-4 w-4" />
          </div>
          <span className="l">Awaiting review</span>
          <span className="n">{rows.length}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="clock" className="h-4 w-4" />
          </div>
          <span className="l">Oldest submission</span>
          <span className="n">{oldestAge ?? '—'}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="check" className="h-4 w-4" />
          </div>
          <span className="l">Approved today</span>
          <span className="n">{approvedToday}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="x" className="h-4 w-4" />
          </div>
          <span className="l">Rejected today</span>
          <span className="n">{rejectedToday}</span>
        </div>
      </div>

      <div className="toolbar">
        <button
          type="button"
          className={courseFilter === 'all' ? 'chip on' : 'chip'}
          onClick={() => setCourseFilter('all')}
        >
          All courses
        </button>
        {courseOptions.map((c) => (
          <button
            key={c.courseId}
            type="button"
            className={courseFilter === c.courseId ? 'chip on' : 'chip'}
            onClick={() => setCourseFilter(c.courseId)}
          >
            {c.courseTitle}
          </button>
        ))}
        <button
          type="button"
          className={sort === 'oldest' ? 'chip on' : 'chip'}
          onClick={() => setSort(sort === 'oldest' ? 'newest' : 'oldest')}
          aria-label={sort === 'oldest' ? 'Showing oldest first' : 'Showing newest first'}
        >
          {sort === 'oldest' ? 'Oldest first' : 'Newest first'}
        </button>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="tcol-check">
                <input
                  type="checkbox"
                  className="tcheck"
                  aria-label="Select all"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                />
              </th>
              <th>Learner</th>
              <th>Course</th>
              <th>Submitted</th>
              <th>Attachment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.evidenceId}>
                <td className="tcol-check">
                  <input
                    type="checkbox"
                    className="tcheck"
                    aria-label={`Select ${row.learnerName}`}
                    checked={selected.has(row.evidenceId)}
                    onChange={() => toggleRow(row.evidenceId)}
                  />
                </td>
                <td>{row.learnerName}</td>
                <td>{row.courseTitle}</td>
                <td>{timeAgo(row.submittedAt)}</td>
                <td>
                  {row.hasFile ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--accent)',
                        fontWeight: 600,
                        fontSize: 12.5,
                      }}
                    >
                      <Icon name="image" className="h-3.5 w-3.5" />1 attachment
                    </span>
                  ) : (
                    <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No attachment</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Link
                    href={`/admin/learners/${row.learnerId}/review/${row.courseId}`}
                    style={{ fontWeight: 600, fontSize: 13 }}
                  >
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <span>
            Showing {filtered.length} of {rows.length}
          </span>
        </div>
      </div>
    </div>
  );
}
