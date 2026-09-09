'use client';

import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/icons';
import type { CourseProgress } from '@/lib/data/progress';
import { courseDurationMinutes, courseLessonCount, type Course } from '@/lib/types';
import { getCourseStatus } from '@/lib/course-status';
import { cn } from '@/lib/cn';

const STEP_ICONS: IconName[] = ['hardhat', 'layers', 'grid', 'users'];

export function stepIcon(pathwayOrder: number): IconName {
  return STEP_ICONS[(pathwayOrder - 1) % STEP_ICONS.length] ?? 'book';
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `~${hours} hr`;
}

export function PathwayCourseCard({
  course,
  progress,
  isNextUp,
  unlocked = false,
}: {
  course: Course;
  progress?: CourseProgress;
  isNextUp?: boolean;
  /** RESTRICTED course with a CourseUnlock for this learner — treated as self-enrollable. */
  unlocked?: boolean;
}) {
  const router = useRouter();
  const enrolled = Boolean(progress?.enrolled);
  const total = courseLessonCount(course);
  const done = progress?.completedLessonIds.length ?? 0;
  const status = getCourseStatus(course, progress);
  const locked = !enrolled && course.access === 'restricted' && !unlocked;
  const nextUp = Boolean(isNextUp) && !locked;

  const handleActivate = () => {
    if (locked) return;
    router.push(`/learner/courses/${course.id}`);
  };

  const ctaLabel = !enrolled
    ? 'View course'
    : status === 'verified'
      ? 'Review course'
      : done > 0
        ? 'Continue'
        : 'Start course';

  return (
    <button
      type="button"
      onClick={handleActivate}
      disabled={locked}
      aria-disabled={locked}
      className={cn(
        'group relative flex h-full w-full flex-col gap-4 rounded-2xl border bg-bg-card p-5 text-left transition-colors',
        locked && 'cursor-not-allowed',
        nextUp
          ? 'border-2 border-brand-accent bg-accent-tint/40'
          : 'border-border-subtle hover:border-brand-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              nextUp
                ? 'bg-brand-accent text-on-brand'
                : locked
                  ? 'bg-bg-subtle text-text-muted'
                  : 'bg-brand-tint text-brand-primary',
            )}
          >
            {String(course.pathwayOrder).padStart(2, '0')}
          </span>
          <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            {course.category}
          </span>
        </div>

        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-subtle px-2.5 py-0.5 text-xs font-medium text-text-muted">
            <Icon name="lock" className="size-3" />
            Locked
          </span>
        ) : nextUp ? (
          <span className="rounded-full bg-accent-tint px-2.5 py-0.5 text-xs font-semibold text-accent-tint-text">
            Next up
          </span>
        ) : !enrolled ? (
          <span className="rounded-full bg-bg-subtle px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            Not started
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          'flex size-11 items-center justify-center rounded-xl',
          locked ? 'bg-bg-subtle text-text-muted' : 'bg-brand-tint text-brand-primary',
        )}
      >
        <Icon name={stepIcon(course.pathwayOrder)} className="size-5" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="text-lg leading-snug font-semibold text-brand-heading">{course.title}</h3>
        <p className="text-sm text-text-secondary">
          {locked ? 'Unlocks after completing previous courses.' : course.description}
        </p>
      </div>

      {!locked && (
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="book" className="size-3.5" />
            {total} lessons
          </span>
          <span className="text-border-default">|</span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="size-3.5" />
            {formatDuration(courseDurationMinutes(course))}
          </span>
        </div>
      )}

      <div className="mt-auto pt-1">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted">
            <Icon name="lock" className="size-4" />
            Locked
          </span>
        ) : nextUp ? (
          <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-brand-accent px-4 text-sm font-medium text-on-brand transition-colors group-hover:bg-brand-accent-hover">
            {ctaLabel}
            <Icon name="arrow-right" className="size-4" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary transition-[gap] group-hover:gap-2.5">
            {ctaLabel}
            <Icon name="arrow-right" className="size-4" />
          </span>
        )}
      </div>
    </button>
  );
}
