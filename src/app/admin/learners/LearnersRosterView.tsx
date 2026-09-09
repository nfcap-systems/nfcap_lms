import Link from 'next/link';
import { Badge, Card } from '@/components/ui';
import { Icon } from '@/components/icons';
import { getCourseStatus } from '@/lib/course-status';
import type { LearnerRecord } from '@/lib/data/learners';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';

export function LearnersRosterView({
  learners,
  courses,
  progressByLearner,
}: {
  learners: LearnerRecord[];
  courses: AdminCourse[];
  progressByLearner: Record<string, Record<string, CourseProgress>>;
}) {
  return (
    <Card>
      <div className="divide-y divide-border-subtle">
        {learners.map((learner) => {
          const progress = progressByLearner[learner.id] ?? {};
          const enrolledCourses = courses.filter((c) => progress[c.id]?.enrolled);
          const pendingCount = courses.filter(
            (c) => getCourseStatus(c, progress[c.id]) === 'pending-verification',
          ).length;

          return (
            <Link
              key={learner.id}
              href={`/admin/learners/${learner.id}`}
              className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-bg-subtle"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-on-brand">
                  {learner.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{learner.name}</p>
                  <p className="text-xs text-text-muted">{learner.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">
                  {enrolledCourses.length} of {courses.length} courses
                </span>
                {pendingCount > 0 && <Badge tone="pending">{pendingCount} awaiting review</Badge>}
                <Icon name="chevron-right" className="size-4 text-text-muted" />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
