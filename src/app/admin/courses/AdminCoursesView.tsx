'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { setCoursePublished } from '@/lib/actions/courses';
import { courseLessonCount } from '@/lib/types';
import type { AdminCourse } from '@/lib/data/courses';
import { Icon } from '@/components/icons';
import { NewCourseDialog } from '@/components/admin-shell/quick-create/NewCourseDialog';

const PAGE_SIZE = 10;

export function AdminCoursesView({ courses }: { courses: AdminCourse[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const sorted = React.useMemo(
    () => [...courses].sort((a, b) => a.pathwayOrder - b.pathwayOrder),
    [courses],
  );

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter(
      (c) => c.title.toLowerCase().includes(query) || c.category.toLowerCase().includes(query),
    );
  }, [sorted, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((c) => selected.has(c.id));

  function togglePublished(course: AdminCourse) {
    startTransition(async () => {
      try {
        await setCoursePublished(course.id, !course.published);
        toast.success(course.published ? 'Course unpublished' : 'Course published');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update the course.');
      }
    });
  }

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

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Courses</h1>
          <p>
            {courses.length} course{courses.length === 1 ? '' : 's'} across the apprenticeship
            program. Open a course to manage its sections, lessons, and knowledge assessment in the
            Curriculum Builder.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <button type="button" className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            + Add course
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="dtsearch" style={{ maxWidth: 320 }}>
          <Icon name="search" className="h-3.5 w-3.5" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search courses..."
            aria-label="Search courses"
          />
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
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
              <th>Course</th>
              <th>Status</th>
              <th>Sections</th>
              <th>Lessons</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}
                >
                  No courses found.
                </td>
              </tr>
            ) : (
              pageRows.map((course) => {
                const isSelected = selected.has(course.id);
                return (
                  <tr key={course.id}>
                    <td className="tcol-check">
                      <span
                        className="tcheck"
                        aria-label="Select row"
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => toggleRow(course.id)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleRow(course.id)}
                        style={isSelected ? { background: 'var(--nfcap-accent)' } : undefined}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {course.access === 'restricted' && (
                          <Icon
                            name="lock"
                            className="h-4 w-4"
                            style={{ color: 'var(--ink-muted)', flexShrink: 0 }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{course.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                            {course.access === 'restricted'
                              ? 'Restricted — requires funding approval or admin grant'
                              : course.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={course.published ? 'badge-complete' : 'badge-neutral'}>
                        {course.published ? 'Published' : 'Unpublished'}
                      </span>
                    </td>
                    <td>{course.sections.length}</td>
                    <td>{courseLessonCount(course)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => togglePublished(course)}
                        style={{
                          fontSize: 12.5,
                          color: 'var(--ink-muted)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          marginRight: 14,
                        }}
                      >
                        {course.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <Link
                        href={`/admin/courses/${course.id}`}
                        style={{ fontWeight: 600, fontSize: 13, color: 'var(--nfcap-accent)' }}
                      >
                        Edit curriculum →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="table-footer">
          <span>
            Showing {pageRows.length} of {filtered.length}
          </span>
          <span>
            Page {page} of {pageCount}
          </span>
        </div>
      </div>

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

      <NewCourseDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
