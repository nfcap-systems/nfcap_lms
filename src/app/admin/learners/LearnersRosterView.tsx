'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { getCourseStatus } from '@/lib/course-status';
import { getInitials } from '@/lib/utils';
import type { LearnerRecord } from '@/lib/data/learners';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import type { LearnerFundingStatus } from '@/lib/data/wioa';
import { Badge, DataTableCard, DataTableCardHeader, Pagination, StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';

type RowStatus = 'pending' | 'complete' | 'active' | 'funding';

type LearnerRow = {
  learner: LearnerRecord;
  enrolledCount: number;
  totalCourses: number;
  pendingCount: number;
  pathway: string | null;
  cohortName: string | null;
  fundingStatus: LearnerFundingStatus;
  activityTier: 'active' | 'week' | 'stale';
  rowStatus: RowStatus;
};

const DAY_MS = 86_400_000;
const PAGE_SIZE = 10;

const rowStatusBadge: Record<
  RowStatus,
  { tone: 'pending' | 'success' | 'info' | 'neutral'; label: string }
> = {
  pending: { tone: 'pending', label: '● Pending review' },
  complete: { tone: 'success', label: '✓ Complete' },
  active: { tone: 'info', label: '● Active' },
  funding: { tone: 'neutral', label: '' }, // label filled in from fundingStatus at render time
};

const fundingLabel: Record<LearnerFundingStatus, string> = {
  funded: '● Funded',
  pending: '● Pending review',
  self_pay: 'Self-pay',
};

export function LearnersRosterView({
  learners,
  courses,
  progressByLearner,
  cohortMembershipByLearner,
  fundingStatusByLearner,
  fundedCaseCount,
}: {
  learners: LearnerRecord[];
  courses: AdminCourse[];
  progressByLearner: Record<string, Record<string, CourseProgress>>;
  cohortMembershipByLearner: Map<string, { cohortId: string; cohortName: string }>;
  fundingStatusByLearner: Record<string, LearnerFundingStatus>;
  fundedCaseCount: number;
}) {
  const [now] = useState(() => Date.now());
  const [search, setSearch] = useState('');
  const [pathwayFilter, setPathwayFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RowStatus>('all');
  const [fundingFilter, setFundingFilter] = useState<'all' | LearnerFundingStatus>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const rows: LearnerRow[] = useMemo(
    () =>
      learners
        .map((learner) => {
          const progress = progressByLearner[learner.id] ?? {};
          const enrolledCourses = courses.filter((c) => progress[c.id]?.enrolled);
          const enrolledCount = enrolledCourses.length;
          const pendingCount = courses.filter(
            (c) => getCourseStatus(c, progress[c.id]) === 'pending-verification',
          ).length;

          let lastActivityAt = 0;
          for (const c of enrolledCourses) {
            const p = progress[c.id]!;
            const candidates = [
              new Date(p.enrolledAt).getTime(),
              p.evidence ? new Date(p.evidence.submittedAt).getTime() : 0,
              p.evidence?.statusUpdatedAt ? new Date(p.evidence.statusUpdatedAt).getTime() : 0,
              p.quizAttempt ? new Date(p.quizAttempt.submittedAt).getTime() : 0,
            ];
            lastActivityAt = Math.max(lastActivityAt, ...candidates);
          }
          const daysSinceActivity =
            lastActivityAt === 0 ? Infinity : (now - lastActivityAt) / DAY_MS;
          const activityTier: LearnerRow['activityTier'] =
            daysSinceActivity <= 1 ? 'active' : daysSinceActivity <= 7 ? 'week' : 'stale';

          const allEnrolledComplete =
            enrolledCount > 0 &&
            enrolledCourses.every((c) => getCourseStatus(c, progress[c.id]) === 'verified');
          const hasStarted = enrolledCourses.some((c) => {
            const p = progress[c.id]!;
            return p.completedLessonIds.length > 0 || p.quizAttempt || p.evidence;
          });

          const fundingStatus = fundingStatusByLearner[learner.id] ?? 'self_pay';
          const rowStatus: RowStatus =
            pendingCount > 0
              ? 'pending'
              : allEnrolledComplete
                ? 'complete'
                : hasStarted
                  ? 'active'
                  : 'funding';

          const cohort = cohortMembershipByLearner.get(learner.id) ?? null;

          return {
            learner,
            enrolledCount,
            totalCourses: courses.length,
            pendingCount,
            pathway: enrolledCourses[0]?.category ?? null,
            cohortName: cohort?.cohortName ?? null,
            fundingStatus,
            activityTier,
            rowStatus,
          };
        })
        .sort((a, b) => a.learner.name.localeCompare(b.learner.name)),
    [learners, courses, progressByLearner, cohortMembershipByLearner, fundingStatusByLearner, now],
  );

  const pathwayOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.pathway).filter((p): p is string => Boolean(p)))).sort(),
    [rows],
  );
  const cohortOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.cohortName).filter((c): c is string => Boolean(c))),
      ).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (pathwayFilter !== 'all' && row.pathway !== pathwayFilter) return false;
      if (cohortFilter !== 'all' && row.cohortName !== cohortFilter) return false;
      if (statusFilter !== 'all' && row.rowStatus !== statusFilter) return false;
      if (fundingFilter !== 'all' && row.fundingStatus !== fundingFilter) return false;
      if (!query) return true;
      return (
        row.learner.name.toLowerCase().includes(query) ||
        row.learner.email.toLowerCase().includes(query)
      );
    });
  }, [rows, search, pathwayFilter, cohortFilter, statusFilter, fundingFilter]);

  const kpis = useMemo(
    () => ({
      total: rows.length,
      activeThisWeek: rows.filter((r) => r.activityTier !== 'stale').length,
      pendingReview: rows.reduce((sum, r) => sum + r.pendingCount, 0),
    }),
    [rows],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    const pageIds = pageRows.map((r) => r.learner.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function exportCsv() {
    const header = ['Name', 'Email', 'Pathway', 'Cohort', 'Courses', 'Status', 'Funding'];
    const csvRows = filtered.map((row) =>
      [
        row.learner.name,
        row.learner.email,
        row.pathway ?? '',
        row.cohortName ?? '',
        `${row.enrolledCount} of ${row.totalCourses}`,
        row.rowStatus === 'funding'
          ? fundingLabel[row.fundingStatus]
          : rowStatusBadge[row.rowStatus].label,
        fundingLabel[row.fundingStatus],
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `learners-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <StateCard
        icon={<Icon name="users" className="h-5 w-5" />}
        title="No learners yet"
        description="Learners will appear here once they sign up."
      />
    );
  }

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.learner.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Learners</h1>
          <p>{rows.length} learners across every pathway.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          {/* No admin-initiated learner-creation flow exists anywhere in the app yet — disabled
              rather than fabricated, same pattern as the Dashboard's "Add Learner" button. */}
          <button type="button" className="btn-primary btn-sm" disabled title="Not yet built">
            + Add Learner
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <div className="mcard">
          <div className="ic">
            <Icon name="users" className="h-4 w-4" />
          </div>
          <span className="l">Total</span>
          <span className="n">{kpis.total}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="check" className="h-4 w-4" />
          </div>
          <span className="l">Active this week</span>
          <span className="n">{kpis.activeThisWeek}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="clock" className="h-4 w-4" />
          </div>
          <span className="l">Pending review</span>
          <span className="n">{kpis.pendingReview}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="bar-chart" className="h-4 w-4" />
          </div>
          <span className="l">Funded (WIOA)</span>
          <span className="n">{fundedCaseCount}</span>
        </div>
      </div>

      <DataTableCard>
        <DataTableCardHeader
          title="All learners"
          description="Manage trainee enrollment, progress and funding status."
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
                  placeholder="Search learners..."
                  aria-label="Search learners"
                />
              </div>
              {/* Column hide/customize isn't built — disabled rather than fabricated. */}
              <button type="button" className="dtbtn" disabled title="Not yet built">
                <Icon name="list" className="h-3.5 w-3.5" />
                Hide
              </button>
              <button type="button" className="dtbtn" disabled title="Not yet built">
                <Icon name="settings" className="h-3.5 w-3.5" />
                Customize
              </button>
              <button type="button" className="dtbtn" onClick={exportCsv}>
                <Icon name="download" className="h-3.5 w-3.5" />
                Export
              </button>
            </>
          }
        />

        <div className="dt-filters-row">
          <div className="dt-filter-group">
            <div className="dt-filter">
              <span className="lbl">Pathway:</span>
              <select
                value={pathwayFilter}
                onChange={(e) => {
                  setPathwayFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by pathway"
              >
                <option value="all">All</option>
                {pathwayOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="dt-filter">
              <span className="lbl">Cohort:</span>
              <select
                value={cohortFilter}
                onChange={(e) => {
                  setCohortFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by cohort"
              >
                <option value="all">All</option>
                {cohortOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="dt-filter">
              <span className="lbl">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | RowStatus);
                  setPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="all">All</option>
                <option value="pending">Pending review</option>
                <option value="complete">Complete</option>
                <option value="active">Active</option>
                <option value="funding">Self-pay / not started</option>
              </select>
            </div>
          </div>
          <div className="dt-filter">
            <span className="lbl">Funding:</span>
            <select
              value={fundingFilter}
              onChange={(e) => {
                setFundingFilter(e.target.value as 'all' | LearnerFundingStatus);
                setPage(1);
              }}
              aria-label="Filter by funding"
            >
              <option value="all">All</option>
              <option value="funded">Funded</option>
              <option value="pending">Pending review</option>
              <option value="self_pay">Self-pay</option>
            </select>
          </div>
        </div>

        <div className="dt-selrow">
          <span className="dt-selcount">{selected.size} selected</span>
          {/* Grid view isn't built — List stays the only working mode, same honest-disclosure
              pattern as the other disabled controls on this page. */}
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
              <th>Learner</th>
              <th>Pathway / Cohort</th>
              <th>Courses</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}
                >
                  No learners found.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const isSelected = selected.has(row.learner.id);
                const badge =
                  row.rowStatus === 'funding'
                    ? { tone: rowStatusBadge.funding.tone, label: fundingLabel[row.fundingStatus] }
                    : rowStatusBadge[row.rowStatus];
                return (
                  <tr key={row.learner.id}>
                    <td className="tcol-check">
                      <span
                        className="tcheck"
                        aria-label="Select row"
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => toggleRow(row.learner.id)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleRow(row.learner.id)}
                        style={isSelected ? { background: 'var(--nfcap-accent)' } : undefined}
                      />
                    </td>
                    <td>
                      <Link href={`/admin/learners/${row.learner.id}`} className="rowname">
                        <div className="av-wrap">
                          <div className="av">{getInitials(row.learner.name)}</div>
                          <div className={`av-dot ${row.activityTier}`} />
                        </div>
                        <div>
                          <div>{row.learner.name}</div>
                          <div className="meta">{row.learner.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <div className="rowpathway">
                        {row.pathway ?? '—'}
                        <div className="sub">{row.cohortName ?? 'No cohort'}</div>
                      </div>
                    </td>
                    <td>
                      {row.enrolledCount} of {row.totalCourses} enrolled
                    </td>
                    <td>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/admin/learners/${row.learner.id}`}
                        className="rowkebab"
                        aria-label="View learner"
                      >
                        <Icon name="chevron-right" className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="dt-footer">
          <span className="dt-selcount">
            {filtered.length} learner{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </DataTableCard>

      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
}
