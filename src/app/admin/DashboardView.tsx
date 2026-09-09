import Link from 'next/link';
import { Badge, Card, CardContent } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { LearnerRecord } from '@/lib/data/learners';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';

export function DashboardView({
  courses,
  learners,
  progressByLearner,
}: {
  courses: AdminCourse[];
  learners: LearnerRecord[];
  progressByLearner: Record<string, Record<string, CourseProgress>>;
}) {
  const pendingReviews = learners.flatMap((learner) => {
    const progress = progressByLearner[learner.id] ?? {};
    return courses
      .filter((c) => progress[c.id]?.evidence?.status === 'pending')
      .map((c) => ({ learner, course: c, evidence: progress[c.id]!.evidence! }));
  });

  const stats = [
    { label: 'Learners', value: learners.length, icon: 'users' as const },
    { label: 'Courses', value: courses.length, icon: 'layers' as const },
    { label: 'Pending Reviews', value: pendingReviews.length, icon: 'clipboard' as const },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                <Icon name={stat.icon} className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-brand-heading">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Needs Review</h2>
        {pendingReviews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-text-secondary">
              No practical evidence is waiting on review right now.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border-subtle">
              {pendingReviews.map(({ learner, course, evidence }) => (
                <Link
                  key={`${learner.id}-${course.id}`}
                  href={`/admin/learners/${learner.id}`}
                  className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-bg-subtle"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{learner.name}</p>
                    <p className="text-xs text-text-muted">
                      {course.title} · submitted{' '}
                      {new Date(evidence.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="pending">Pending</Badge>
                    <Icon name="chevron-right" className="size-4 text-text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
