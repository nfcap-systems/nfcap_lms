'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { getCourseStatus } from '@/lib/course-status';
import { getInitials } from '@/lib/utils';
import type { LearnerRecord } from '@/lib/data/learners';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import { Badge, DataTableCard, DataTableCardHeader, Pagination, StateCard } from '@/components/ui';
import { Icon } from '@/components/icons';

type LearnerRow = {
  learner: LearnerRecord;
  enrolledCount: number;
  totalCourses: number;
  pendingCount: number;
  isActive: boolean;
};

const PAGE_SIZE = 10;

export function LearnersRosterView({
  learners,
  courses,
  progressByLearner,
}: {
  learners: LearnerRecord[];
  courses: AdminCourse[];
  progressByLearner: Record<string, Record<string, CourseProgress>>;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const rows: LearnerRow[] = useMemo(
    () =>
      learners
        .map((learner) => {
          const progress = progressByLearner[learner.id] ?? {};
          const enrolledCount = courses.filter((c) => progress[c.id]?.enrolled).length;
          const pendingCount = courses.filter(
            (c) => getCourseStatus(c, progress[c.id]) === 'pending-verification',
          ).length;
          const isActive = courses.some((c) => {
            const p = progress[c.id];
            return p?.enrolled && (p.completedLessonIds.length > 0 || p.quizAttempt || p.evidence);
          });
          return { learner, enrolledCount, totalCourses: courses.length, pendingCount, isActive };
        })
        .sort((a, b) => a.learner.name.localeCompare(b.learner.name)),
    [learners, courses, progressByLearner],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.learner.name.toLowerCase().includes(query) ||
        row.learner.email.toLowerCase().includes(query),
    );
  }, [rows, search]);

  const kpis = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.isActive).length,
      pendingReview: rows.reduce((sum, r) => sum + r.pendingCount, 0),
    }),
    [rows],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <StateCard
        icon={<Icon name="users" className="h-5 w-5" />}
        title="No learners yet"
        description="Learners will appear here once they sign up."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Learners</h1>
          <p>Roster of all learners with progress visibility across the program.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
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
          <span className="l">Active</span>
          <span className="n">{kpis.active}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="clock" className="h-4 w-4" />
          </div>
          <span className="l">Pending review</span>
          <span className="n">{kpis.pendingReview}</span>
        </div>
      </div>

      <DataTableCard>
        <DataTableCardHeader
          title="All learners"
          description="Manage trainee enrollment and progress."
          actions={
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
          }
        />

        <table className="data-table">
          <thead>
            <tr>
              <th>Learner</th>
              <th>Courses</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}>
                  No learners found.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.learner.id}>
                  <td>
                    <Link href={`/admin/learners/${row.learner.id}`} className="rowname">
                      <div className="av-wrap">
                        <div className="av">{getInitials(row.learner.name)}</div>
                        {row.isActive && <div className="av-dot active" />}
                      </div>
                      <div>
                        <div>{row.learner.name}</div>
                        <div className="meta">{row.learner.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td>
                    {row.enrolledCount} of {row.totalCourses} enrolled
                  </td>
                  <td>
                    {row.pendingCount > 0 ? (
                      <Badge tone="pending">
                        {row.pendingCount} awaiting review
                      </Badge>
                    ) : (
                      <span style={{ color: 'var(--ink-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))
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
