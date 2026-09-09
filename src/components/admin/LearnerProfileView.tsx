'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AdminCourse } from '@/lib/data/courses';
import type { LearnerRecord } from '@/lib/data/learners';
import type { CourseProgress, CourseUnlockRecord } from '@/lib/data/progress';
import { setEvidenceStatus, grantCourseUnlock } from '@/lib/actions/progress';
import { courseLessonCount } from '@/lib/types';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';

export function LearnerProfileView({
  learner,
  courses,
  progress,
  courseUnlocks,
}: {
  learner: LearnerRecord;
  courses: AdminCourse[];
  progress: Record<string, CourseProgress>;
  /** Restricted-course access grants keyed by course slug — only relevant to the Course access
   * card below (docs/build/WIOA_BUILD_WORKFLOW.md Phase 4). */
  courseUnlocks?: Record<string, CourseUnlockRecord>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const enrolledCourses = courses.filter((c) => progress[c.id]?.enrolled);
  const restrictedCourses = courses.filter((c) => c.access === 'restricted');

  function updateStatus(courseId: string, status: 'approved' | 'rejected') {
    startTransition(async () => {
      await setEvidenceStatus(learner.id, courseId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {restrictedCourses.length > 0 && (
        <CourseAccessCard
          learnerId={learner.id}
          restrictedCourses={restrictedCourses}
          courseUnlocks={courseUnlocks ?? {}}
        />
      )}

      {enrolledCourses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-secondary">
            {learner.name} isn&apos;t enrolled in any courses yet.
          </CardContent>
        </Card>
      ) : (
        enrolledCourses.map((course) => {
        const courseProgress = progress[course.id];
        const total = courseLessonCount(course);
        const done = courseProgress?.completedLessonIds.length ?? 0;
        const status = getCourseStatus(course, courseProgress);
        const evidence = courseProgress?.evidence;

        return (
          <Card key={course.id}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    {course.category}
                  </p>
                  <h3 className="text-base font-semibold text-brand-heading">{course.title}</h3>
                </div>
                <Badge tone={courseStatusTone[status]}>{courseStatusLabel[status]}</Badge>
              </div>

              <ProgressBar
                value={done}
                max={total}
                label={`${done} of ${total} lessons`}
                showPercentage
              />

              {courseProgress?.quizAttempt && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Icon name="clipboard" className="size-4 text-text-muted" />
                  Knowledge Assessment: {courseProgress.quizAttempt.scorePercent}%
                  {courseProgress.quizAttempt.passed ? ' (passed)' : ' (not passed)'}
                </div>
              )}

              {evidence && (
                <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-subtle p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">Practical Evidence</p>
                    <span className="text-xs text-text-muted">
                      Submitted{' '}
                      {new Date(evidence.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">{evidence.description}</p>
                  {evidence.fileName && (
                    <div className="flex w-fit items-center gap-2 rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-secondary">
                      <Icon name="paperclip" className="size-4 shrink-0 text-brand-primary" />
                      {evidence.fileName}
                    </div>
                  )}

                  {evidence.status === 'pending' ? (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => updateStatus(course.id, 'approved')}>
                        <Icon name="check" className="size-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(course.id, 'rejected')}
                      >
                        <Icon name="x" className="size-4" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateStatus(
                            course.id,
                            evidence.status === 'approved' ? 'rejected' : 'approved',
                          )
                        }
                      >
                        Change to {evidence.status === 'approved' ? 'Rejected' : 'Approved'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
        })
      )}
    </div>
  );
}

function CourseAccessCard({
  learnerId,
  restrictedCourses,
  courseUnlocks,
}: {
  learnerId: string;
  restrictedCourses: AdminCourse[];
  courseUnlocks: Record<string, CourseUnlockRecord>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [grantingId, setGrantingId] = useState<string | null>(null);

  function grant(courseSlug: string) {
    setGrantingId(courseSlug);
    startTransition(async () => {
      await grantCourseUnlock(learnerId, courseSlug);
      setGrantingId(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course access</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {restrictedCourses.map((course) => {
          const unlock = courseUnlocks[course.id];
          return (
            <div
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle p-3"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{course.title}</p>
                {unlock && (
                  <p className="text-xs text-text-muted">
                    Unlocked via{' '}
                    {unlock.source === 'WIOA_FUNDING' ? 'WIOA funding' : 'Admin assignment'}
                  </p>
                )}
              </div>
              {unlock ? (
                <Badge tone="success">Unlocked</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending && grantingId === course.id}
                  onClick={() => grant(course.id)}
                >
                  {pending && grantingId === course.id ? 'Granting…' : 'Grant access'}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
