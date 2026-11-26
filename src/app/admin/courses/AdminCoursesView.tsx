'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { setCoursePublished } from '@/lib/actions/courses';
import { courseLessonCount } from '@/lib/types';
import type { AdminCourse } from '@/lib/data/courses';
import { Icon } from '@/components/icons';
import { NewCourseDialog } from '@/components/admin-shell/quick-create/NewCourseDialog';
import {
  DataTableCard,
  DataTableCardHeader,
  DataTableFilters,
  Pagination,
  RowActionsMenu,
} from '@/components/ui';
import { DropdownMenuItem } from '@/components/admin-ui/dropdown-menu';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | 'published' | 'unpublished';
type AccessFilter = 'all' | 'open' | 'restricted';

export function AdminCoursesView({ courses }: { courses: AdminCourse[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(
    () => [...courses].sort((a, b) => a.pathwayOrder - b.pathwayOrder),
    [courses],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sorted.filter((c) => {
      if (statusFilter === 'published' && !c.published) return false;
      if (statusFilter === 'unpublished' && c.published) return false;
      if (accessFilter === 'open' && c.access === 'restricted') return false;
      if (accessFilter === 'restricted' && c.access !== 'restricted') return false;
      if (!query) return true;
      return c.title.toLowerCase().includes(query) || c.category.toLowerCase().includes(query);
    });
  }, [sorted, search, statusFilter, accessFilter]);

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

  function exportCsv() {
    const header = ['Course', 'Pathway', 'Access', 'Status', 'Sections', 'Lessons'];
    const rows = filtered.map((c) => [
      c.title,
      c.category,
      c.access === 'restricted' ? 'Restricted' : 'Open',
      c.published ? 'Published' : 'Unpublished',
      String(c.sections.length),
      String(courseLessonCount(c)),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `courses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

      <DataTableCard>
        <DataTableCardHeader
          title="All courses"
          description="Publish state, access, and curriculum size for every course."
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
                  placeholder="Search courses..."
                  aria-label="Search courses"
                />
              </div>
              <button type="button" className="dtbtn" onClick={exportCsv}>
                <Icon name="download" className="h-3.5 w-3.5" />
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
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
              </select>
            </div>
            <div className="dt-filter">
              <span className="lbl">Access:</span>
              <select
                value={accessFilter}
                onChange={(e) => {
                  setAccessFilter(e.target.value as AccessFilter);
                  setPage(1);
                }}
                aria-label="Filter by access"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>
          <div className="viewtoggle">
            <button type="button" className="on" aria-label="List view">
              <Icon name="list" className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Grid view" disabled title="Not yet built">
              <Icon name="grid" className="h-3.5 w-3.5" />
            </button>
          </div>
        </DataTableFilters>

        <div className="dt-selrow">
          <span className="dt-selcount">{selected.size} selected</span>
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
              <th>Course</th>
              <th>Status</th>
              <th>Sections</th>
              <th>Lessons</th>
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
                  No courses match this filter.
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
                    <td style={{ textAlign: 'right' }}>
                      <RowActionsMenu label={`Actions for ${course.title}`}>
                        <DropdownMenuItem
                          onSelect={() => router.push(`/admin/courses/${course.id}`)}
                        >
                          <Icon name="edit" className="h-4 w-4" />
                          Edit curriculum
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => togglePublished(course)}>
                          <Icon name={course.published ? 'x' : 'check'} className="h-4 w-4" />
                          {course.published ? 'Unpublish' : 'Publish'}
                        </DropdownMenuItem>
                      </RowActionsMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="dt-footer">
          <span>
            Showing {pageRows.length} of {filtered.length}
          </span>
          <span>
            Page {page} of {pageCount}
          </span>
        </div>
      </DataTableCard>

      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}

      <NewCourseDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
