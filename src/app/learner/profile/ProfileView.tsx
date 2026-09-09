import Link from 'next/link';
import { Badge, Card, CardContent } from '@/components/ui';
import { Icon } from '@/components/icons';
import { courseLessonCount } from '@/lib/types';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import type { Credential } from '@/lib/data/credentials';

export function ProfileView({
  courses,
  progressMap,
  credentials,
  name,
  email,
  memberSince,
}: {
  courses: AdminCourse[];
  progressMap: Record<string, CourseProgress>;
  credentials: Credential[];
  name: string;
  email: string;
  memberSince: string;
}) {
  const enrolledCourses = [...courses]
    .filter((c) => progressMap[c.id]?.enrolled)
    .sort((a, b) => a.pathwayOrder - b.pathwayOrder);

  const totalLessonsCompleted = enrolledCourses.reduce(
    (sum, c) => sum + (progressMap[c.id]?.completedLessonIds.length ?? 0),
    0,
  );

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('');

  const stats = [
    { label: 'Enrolled Courses', value: enrolledCourses.length, icon: 'book' as const },
    { label: 'Credentials Earned', value: credentials.length, icon: 'award' as const },
    { label: 'Lessons Completed', value: totalLessonsCompleted, icon: 'check' as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-primary text-lg font-semibold text-on-brand">
            {initials}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-brand-heading">{name}</h2>
              <Badge tone="info">Learner</Badge>
            </div>
            <p className="text-sm text-text-secondary">{email}</p>
            <p className="text-xs text-text-muted">Apprentice since {memberSince}</p>
          </div>
        </CardContent>
      </Card>

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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Your Courses
        </h2>
        {enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 py-8">
              <p className="text-sm text-text-secondary">
                You&apos;re not enrolled in any training yet.
              </p>
              <Link
                href="/learner/explore"
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                Browse Course Catalog
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border-subtle">
              {enrolledCourses.map((course) => {
                const progress = progressMap[course.id];
                const status = getCourseStatus(course, progress);
                const total = courseLessonCount(course);
                const done = progress?.completedLessonIds.length ?? 0;
                return (
                  <Link
                    key={course.id}
                    href={`/learner/courses/${course.id}`}
                    className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-bg-subtle"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{course.title}</p>
                      <p className="text-xs text-text-muted">
                        {done} of {total} lessons complete
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={courseStatusTone[status]}>{courseStatusLabel[status]}</Badge>
                      <Icon name="chevron-right" className="size-4 text-text-muted" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/learner/portfolio"
          className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-card transition-colors hover:bg-bg-subtle"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Icon name="briefcase" className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">View Portfolio</p>
            <p className="text-xs text-text-muted">Verified evidence of your demonstrated skills</p>
          </div>
          <Icon name="chevron-right" className="size-4 shrink-0 text-text-muted" />
        </Link>
        <Link
          href="/learner/certificates"
          className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-card transition-colors hover:bg-bg-subtle"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Icon name="award" className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">View Certificates</p>
            <p className="text-xs text-text-muted">
              Credentials earned in the apprenticeship program
            </p>
          </div>
          <Icon name="chevron-right" className="size-4 shrink-0 text-text-muted" />
        </Link>
      </div>
    </div>
  );
}
