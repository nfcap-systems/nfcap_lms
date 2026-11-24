'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge, Button, Card, CardContent, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { CourseProgress } from '@/lib/data/progress';
import { courseDurationMinutes, courseLessonCount, type Course } from '@/lib/types';

// Only 3 real trade photos exist for this retrofit (pulled from the design canvas); cycle
// through them rather than inventing per-course imagery.
const CATALOG_PHOTOS = [
  '/images/learner/safety-tools.jpg',
  '/images/learner/flooring-fundamentals.jpg',
  '/images/learner/tile-installation.jpg',
];

export function ExploreCourseCard({
  course,
  progress,
  unlocked = false,
  photoIndex = 0,
}: {
  course: Course;
  progress?: CourseProgress;
  /** RESTRICTED course with a CourseUnlock for this learner — self-enrollable like an OPEN one. */
  unlocked?: boolean;
  photoIndex?: number;
}) {
  const router = useRouter();
  const enrolled = Boolean(progress?.enrolled);
  const canSelfEnroll = course.access === 'open' || unlocked;
  const lessonCount = courseLessonCount(course);
  const done = progress?.completedLessonIds.length ?? 0;
  const hours = Math.round((courseDurationMinutes(course) / 60) * 10) / 10;

  return (
    <Card className="flex flex-col overflow-hidden">
      <Image
        src={CATALOG_PHOTOS[photoIndex % CATALOG_PHOTOS.length]}
        alt=""
        width={400}
        height={128}
        style={{ width: '100%', height: 128, objectFit: 'cover', display: 'block' }}
      />
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
          <h3 className="text-base font-semibold text-[var(--ink)]">{course.title}</h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{course.description}</p>
        </div>

        {enrolled ? (
          <ProgressBar
            value={done}
            max={lessonCount}
            label={`${done} of ${lessonCount} lessons`}
            showPercentage
          />
        ) : (
          <div className="mt-auto flex items-center gap-4 text-xs text-[var(--ink-muted)]">
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

        {enrolled && canSelfEnroll ? (
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
