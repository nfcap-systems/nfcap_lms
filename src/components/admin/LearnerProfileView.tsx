'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Clipboard, Paperclip, X } from 'lucide-react';

import { Badge, type badgeVariants } from '@/components/admin-ui/badge';
import { Button } from '@/components/admin-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin-ui/card';
import { Progress } from '@/components/admin-ui/progress';
import type { AdminCourse } from '@/lib/data/courses';
import type { LearnerRecord } from '@/lib/data/learners';
import type { CourseProgress, CourseUnlockRecord } from '@/lib/data/progress';
import { setEvidenceStatus, grantCourseUnlock, getEvidenceFileUrl } from '@/lib/actions/progress';
import { courseLessonCount } from '@/lib/types';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';
import type { StatusTone } from '@/components/ui/Badge';
import type { VariantProps } from 'class-variance-authority';

const toneToBadgeVariant: Record<StatusTone, VariantProps<typeof badgeVariants>['variant']> = {
  neutral: 'outline',
  info: 'outline',
  pending: 'warning',
  success: 'success',
  danger: 'destructive',
  restricted: 'outline',
};

export function LearnerProfileView({
  learner,
  courses,
  progress,
  courseUnlocks,
  criteriaCounts = {},
}: {
  learner: LearnerRecord;
  courses: AdminCourse[];
  progress: Record<string, CourseProgress>;
  /** Restricted-course access grants keyed by course slug — only relevant to the Course access
   * card below (docs/build/WIOA_BUILD_WORKFLOW.md Phase 4). */
  courseUnlocks?: Record<string, CourseUnlockRecord>;
  /** Course slug -> criteria count (src/lib/data/courses.ts). A course with any criteria routes
   * its evidence review to the real ADM11-PerCriterionReview screen (feature #7) instead of the
   * inline Approve/Reject below, which only remains for the (currently nonexistent) case of a
   * course with zero criteria. */
  criteriaCounts?: Record<string, number>;
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
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {learner.name} isn&apos;t enrolled in any courses yet.
          </CardContent>
        </Card>
      ) : (
        enrolledCourses.map((course) => {
          const courseProgress = progress[course.id];
          const total = courseLessonCount(course);
          const done = courseProgress?.completedLessonIds.length ?? 0;
          const percent = total === 0 ? 0 : Math.min(100, Math.max(0, (done / total) * 100));
          const status = getCourseStatus(course, courseProgress);
          const evidence = courseProgress?.evidence;

          return (
            <Card key={course.id}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {course.category}
                    </p>
                    <h3 className="text-base font-semibold text-foreground">{course.title}</h3>
                  </div>
                  <Badge variant={toneToBadgeVariant[courseStatusTone[status]]}>
                    {courseStatusLabel[status]}
                  </Badge>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {done} of {total} lessons
                    </span>
                    <span className="font-medium text-foreground">{Math.round(percent)}%</span>
                  </div>
                  <Progress value={percent} />
                </div>

                {courseProgress?.quizAttempt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clipboard className="size-4" />
                    Knowledge Assessment: {courseProgress.quizAttempt.scorePercent}%
                    {courseProgress.quizAttempt.passed ? ' (passed)' : ' (not passed)'}
                  </div>
                )}

                {evidence && (
                  <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">Practical Evidence</p>
                      <span className="text-xs text-muted-foreground">
                        Submitted{' '}
                        {new Date(evidence.submittedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{evidence.description}</p>
                    {evidence.hasFile && (
                      <button
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            const url = await getEvidenceFileUrl(evidence.id);
                            window.open(url, '_blank', 'noopener,noreferrer');
                          });
                        }}
                        className="flex w-fit items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Paperclip className="size-4 shrink-0 text-primary" />
                        {evidence.fileName ?? 'View attachment'}
                      </button>
                    )}

                    {(criteriaCounts[course.id] ?? 0) > 0 ? (
                      <div className="pt-1">
                        <Button size="sm" asChild>
                          <Link href={`/admin/learners/${learner.id}/review/${course.id}`}>
                            Review criteria →
                          </Link>
                        </Button>
                      </div>
                    ) : evidence.status === 'pending' ? (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => updateStatus(course.id, 'approved')}>
                          <Check className="size-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(course.id, 'rejected')}
                        >
                          <X className="size-4" />
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
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{course.title}</p>
                {unlock && (
                  <p className="text-xs text-muted-foreground">
                    Unlocked via{' '}
                    {unlock.source === 'WIOA_FUNDING' ? 'WIOA funding' : 'Admin assignment'}
                  </p>
                )}
              </div>
              {unlock ? (
                <Badge variant="success">Unlocked</Badge>
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
