'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DataTableCard,
  DataTableCardHeader,
  DataTableFilters,
  Pagination,
  StateCard,
} from '@/components/ui';
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
  fileCount: number;
};

const PAGE_SIZE = 10;

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
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  /** Outcome of the last bulk approve — feature #7's gated certification means some rows can be
   * refused, and that has to be shown here rather than thrown (feature #12). */
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) seen.set(row.courseId, row.courseTitle);
    return Array.from(seen, ([courseId, courseTitle]) => ({ courseId, courseTitle }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byCourse = rows.filter((r) => {
      if (courseFilter !== 'all' && r.courseId !== courseFilter) return false;
      if (q && !r.learnerName.toLowerCase().includes(q) && !r.courseTitle.toLowerCase().includes(q))
        return false;
      return true;
    });
    const sorted = [...byCourse].sort((a, b) => {
      const diff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      return sort === 'oldest' ? diff : -diff;
    });
    return sorted;
  }, [rows, courseFilter, sort, search]);

  const oldestAge = rows.length > 0 ? timeAgo(rows[0].submittedAt) : null;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCsv() {
    const header = ['Learner', 'Course', 'Submitted', 'Photos'];
    const csvRows = filtered.map((r) => [
      r.learnerName,
      r.courseTitle,
      new Date(r.submittedAt).toISOString(),
      String(r.fileCount),
    ]);
    const csv = [header, ...csvRows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          const text = `Approved ${result.approved} submission${result.approved === 1 ? '' : 's'}.`;
          setNotice({ tone: 'ok', text });
          toast.success(text);
        } else {
          const names = result.skipped
            .map((s) => {
              const row = selectedRows.find(
                (r) => r.learnerId === s.learnerId && r.courseId === s.courseSlug,
              );
              return row ? `${row.learnerName} — ${row.courseTitle}` : s.courseSlug;
            })
            .join('; ');
          const text =
            `Approved ${result.approved} of ${items.length}. ` +
            `Needs per-criterion review before it can be certified: ${names}.`;
          setNotice({ tone: 'warn', text });
          toast.warning(text);
        }
        router.refresh();
      } catch (e) {
        const text = e instanceof Error ? e.message : 'Bulk approve failed.';
        setNotice({ tone: 'warn', text });
        toast.error(text);
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

      <DataTableCard>
        <DataTableCardHeader
          title="All submissions"
          description="Every evidence submission awaiting assessment."
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
                  placeholder="Search submissions..."
                  aria-label="Search submissions"
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
              <span className="lbl">Course:</span>
              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                {courseOptions.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.courseTitle}
                  </option>
                ))}
              </select>
            </div>
            <div className="dt-filter">
              <span className="lbl">Sort:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)}>
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
              </select>
            </div>
          </div>
        </DataTableFilters>

        <div className="dt-selrow">
          <span className="dt-selcount">{selected.size} selected</span>
        </div>

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
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
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
                  {row.fileCount > 0 ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--nfcap-accent)',
                        fontWeight: 600,
                        fontSize: 12.5,
                      }}
                    >
                      <Icon name="image" className="h-3.5 w-3.5" />
                      {row.fileCount} photo{row.fileCount === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No attachment</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Link
                    href={`/admin/learners/${row.learnerId}/review/${row.courseId}`}
                    className="rowkebab"
                    aria-label={`Review ${row.learnerName}'s submission`}
                    title="Review submission"
                  >
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
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
            No submissions match this filter.
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

      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
}
