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

  const allLessons = courses.flatMap((course) => course.sections.flatMap((section) => section.lessons));
  const videoCount = allLessons.filter((lesson) => lesson.type === 'video').length;
  const textCount = allLessons.filter((lesson) => lesson.type === 'text').length;
  const resourceCount = allLessons.filter((lesson) => lesson.type === 'image' || lesson.type === 'resource').length;
  const quizCount = courses.filter((course) => course.assessment.questions.length > 0).length;

  const contentSegments = [
    { label: 'Video', value: videoCount, color: 'var(--color-brand-primary)', dot: 'bg-brand-primary' },
    { label: 'Text', value: textCount, color: 'var(--color-status-pending-text)', dot: 'bg-[var(--color-status-pending-text)]' },
    { label: 'Image/Resource', value: resourceCount, color: 'var(--color-status-success-text)', dot: 'bg-[var(--color-status-success-text)]' },
    { label: 'Quiz', value: quizCount, color: 'var(--color-danger)', dot: 'bg-danger' },
  ].filter((segment) => segment.value > 0);
  const totalContents = contentSegments.reduce((sum, segment) => sum + segment.value, 0);
  const CIRCUMFERENCE = 263.9;
  let cumulativeOffset = 0;
  const donutArcs = contentSegments.map((segment) => {
    const length = totalContents === 0 ? 0 : (segment.value / totalContents) * CIRCUMFERENCE;
    const arc = { ...segment, length, offset: -cumulativeOffset };
    cumulativeOffset += length;
    return arc;
  });

  const courseLessonTotals = new Map(
    courses.map((course) => [
      course.id,
      course.sections.reduce((total, section) => total + section.lessons.length, 0),
    ]),
  );

  let enrollmentsCount = 0;
  let completedEnrollments = 0;
  let activeLearners = 0;
  for (const learner of learners) {
    const progress = progressByLearner[learner.id] ?? {};
    let hasStarted = false;
    for (const course of courses) {
      const courseProgress = progress[course.id];
      if (!courseProgress?.enrolled) continue;
      enrollmentsCount += 1;
      if (courseProgress.completedLessonIds.length > 0 || courseProgress.quizAttempt || courseProgress.evidence) {
        hasStarted = true;
      }
      const totalLessons = courseLessonTotals.get(course.id) ?? 0;
      if (totalLessons > 0 && courseProgress.completedLessonIds.length >= totalLessons) {
        completedEnrollments += 1;
      }
    }
    if (hasStarted) activeLearners += 1;
  }
  const activeLearnerRate = learners.length === 0 ? 0 : Math.round((activeLearners / learners.length) * 100);
  const completionRate =
    enrollmentsCount === 0 ? 0 : Math.round((completedEnrollments / enrollmentsCount) * 100);

  type ActivityEntry =
    | { kind: 'evidence'; learner: LearnerRecord; course: AdminCourse; at: string; status: string }
    | { kind: 'quiz'; learner: LearnerRecord; course: AdminCourse; at: string; passed: boolean; scorePercent: number };

  const recentActivity: ActivityEntry[] = learners
    .flatMap((learner) => {
      const progress = progressByLearner[learner.id] ?? {};
      return courses.flatMap((course): ActivityEntry[] => {
        const courseProgress = progress[course.id];
        if (!courseProgress) return [];
        const entries: ActivityEntry[] = [];
        if (courseProgress.evidence) {
          entries.push({
            kind: 'evidence',
            learner,
            course,
            at: courseProgress.evidence.submittedAt,
            status: courseProgress.evidence.status,
          });
        }
        if (courseProgress.quizAttempt) {
          entries.push({
            kind: 'quiz',
            learner,
            course,
            at: courseProgress.quizAttempt.submittedAt,
            passed: courseProgress.quizAttempt.passed,
            scorePercent: courseProgress.quizAttempt.scorePercent,
          });
        }
        return entries;
      });
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_1fr]">
        <div className="flex flex-col gap-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <Icon name={stat.icon} className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-text-muted">{stat.label}</p>
                  <p className="text-lg font-semibold text-brand-heading">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="flex h-full flex-col gap-4 py-4">
            <p className="text-sm font-semibold text-text-primary">Total Contents</p>
            <div className="flex flex-1 items-center gap-4">
              <div className="relative flex size-24 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="size-24 -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-bg-subtle)" strokeWidth="12" />
                  {donutArcs.map((arc) => (
                    <circle
                      key={arc.label}
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={arc.color}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${arc.length} ${CIRCUMFERENCE}`}
                      strokeDashoffset={arc.offset}
                    />
                  ))}
                </svg>
                <div className="absolute flex flex-col items-center">
                  <p className="text-lg font-semibold text-brand-heading">{totalContents}</p>
                  <p className="text-[10px] text-text-muted">Contents</p>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                {contentSegments.map((segment) => (
                  <div key={segment.label} className="flex items-center gap-2">
                    <span className={`size-2.5 shrink-0 rounded-full ${segment.dot}`} />
                    <span className="truncate font-medium text-text-primary">
                      {segment.value} {segment.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col justify-center gap-6 py-6">
            <p className="text-sm font-semibold text-text-primary">Learner Insights</p>

            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-text-muted">Active Learners</p>
                <p className="text-sm font-semibold text-brand-heading">
                  {activeLearners} / {learners.length}
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${activeLearnerRate}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {activeLearnerRate}% have started at least one course
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-text-muted">Course Completion Rate</p>
                <p className="text-sm font-semibold text-brand-heading">{completionRate}%</p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
                <div className="h-full rounded-full bg-danger" style={{ width: `${completionRate}%` }} />
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {completedEnrollments} of {enrollmentsCount} enrollments completed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
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

        <div>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Recent Learner Activity</h2>
          {recentActivity.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-text-secondary">
                No learner activity yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-border-subtle">
                {recentActivity.map((entry) => (
                  <Link
                    key={`${entry.kind}-${entry.learner.id}-${entry.course.id}`}
                    href={`/admin/learners/${entry.learner.id}`}
                    className="flex items-center gap-4 p-5 transition-colors hover:bg-bg-subtle"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                      <Icon name={entry.kind === 'quiz' ? 'check' : 'upload'} className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{entry.learner.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {entry.kind === 'quiz'
                          ? `Scored ${Math.round(entry.scorePercent)}% on ${entry.course.title} quiz`
                          : `Submitted evidence for ${entry.course.title}`}
                        {' · '}
                        {new Date(entry.at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {entry.kind === 'quiz' ? (
                      <Badge tone={entry.passed ? 'success' : 'danger'}>
                        {entry.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    ) : (
                      <Badge
                        tone={
                          entry.status === 'approved'
                            ? 'success'
                            : entry.status === 'rejected'
                              ? 'danger'
                              : 'pending'
                        }
                      >
                        {entry.status[0].toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
