'use client';

import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { CourseProgress } from '@/lib/data/progress';
import { courseDurationMinutes, courseLessonCount, type Course } from '@/lib/types';

export function ExploreCourseCard({
  course,
  progress,
  unlocked = false,
}: {
  course: Course;
  progress?: CourseProgress;
  /** RESTRICTED course with a CourseUnlock for this learner — self-enrollable like an OPEN one. */
  unlocked?: boolean;
}) {
  const router = useRouter();
  const enrolled = Boolean(progress?.enrolled);
  const canSelfEnroll = course.access === 'open' || unlocked;
  const lessonCount = courseLessonCount(course);
  const done = progress?.completedLessonIds.length ?? 0;
  const hours = Math.round((courseDurationMinutes(course) / 60) * 10) / 10;

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <Badge tone="neutral">{course.category}</Badge>
          {course.access === 'restricted' ? (
            <Badge tone="restricted">
              <Icon name="lock" className="size-3" />
              Restricted
            </Badge>
          ) : (
            <Badge tone="info">Open</Badge>
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-brand-heading">{course.title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{course.description}</p>
        </div>

        {enrolled ? (
          <ProgressBar
            value={done}
            max={lessonCount}
            label={`${done} of ${lessonCount} lessons`}
            showPercentage
          />
        ) : (
          <div className="mt-auto flex items-center gap-4 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="book" className="size-3.5" />
              {lessonCount} lessons
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="size-3.5" />
              {hours}h
            </span>
          </div>
        )}

        {enrolled ? (
          <Button
            size="sm"
            className="w-full"
            onClick={() => router.push(`/learner/courses/${course.id}`)}
          >
            Continue
            <Icon name="arrow-right" className="size-4" />
          </Button>
        ) : canSelfEnroll ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/learner/courses/${course.id}`)}
          >
            View course
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full" disabled>
            <Icon name="lock" className="size-4" />
            Assigned by NFCAP
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
