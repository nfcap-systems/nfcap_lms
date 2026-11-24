'use client';

import { Icon } from '@/components/icons';
import { PathwayView } from '@/components/admin/PathwayView';
import type { AdminCourse } from '@/lib/data/courses';
import type { PathwaySummary } from '@/lib/data/pathway';

export function PathwayDetailView({
  courses,
  summary,
}: {
  courses: AdminCourse[];
  summary: PathwaySummary;
}) {
  const restrictedCount = courses.filter((c) => c.access === 'restricted').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Pathway</h1>
          <p>NFCAP Apprenticeship — manage course order and restrictions</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          {/* No role-preview feature exists yet — disabled rather than fabricated. */}
          <button type="button" className="btn-secondary btn-sm" disabled title="Not yet built">
            Preview as Learner
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <div className="mcard">
          <div className="ic">
            <Icon name="book" className="h-4 w-4" />
          </div>
          <span className="l">Courses in pathway</span>
          <span className="n">{summary.courseCount}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="lock" className="h-4 w-4" />
          </div>
          <span className="l">Restricted courses</span>
          <span className="n">{restrictedCount}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="users" className="h-4 w-4" />
          </div>
          <span className="l">Enrolled learners</span>
          <span className="n">{summary.totalLearners}</span>
        </div>
        <div className="mcard">
          <div className="ic">
            <Icon name="check" className="h-4 w-4" />
          </div>
          <span className="l">Completion rate</span>
          <span className="n">{summary.completionRate}%</span>
        </div>
      </div>

      <PathwayView courses={courses} />
    </div>
  );
}
