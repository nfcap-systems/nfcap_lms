'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Icon, type IconName } from '@/components/icons';
import { PathwayCourseCard, stepIcon } from '@/components/learner/PathwayCourseCard';
import { courseLessonCount, courseDurationMinutes, flattenLessons } from '@/lib/types';
import { cn } from '@/lib/cn';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import type { Credential } from '@/lib/data/credentials';

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeView({
  allCourses,
  pathway,
  progressMap,
  unlockedCourseSlugs,
  credentials,
  firstName,
}: {
  allCourses: AdminCourse[];
  pathway: AdminCourse[];
  progressMap: Record<string, CourseProgress>;
  unlockedCourseSlugs: string[];
  credentials: Credential[];
  firstName: string;
}) {
  const router = useRouter();

  const enrolledCourses = allCourses
    .filter((c) => progressMap[c.id]?.enrolled)
    .sort((a, b) => a.pathwayOrder - b.pathwayOrder);

  const nextUp = enrolledCourses
    .map((course) => {
      const flat = flattenLessons(course);
      const completedLessonIds = progressMap[course.id]?.completedLessonIds ?? [];
      const nextLesson = flat.find((f) => !completedLessonIds.includes(f.lesson.id));
      return nextLesson ? { course, nextLesson } : null;
    })
    .find(Boolean);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="text-sm font-medium text-text-secondary">
          {timeOfDayGreeting()}, {firstName}.
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-brand-heading sm:text-4xl">
          Here&apos;s what&apos;s next in your training.
        </h1>
      </div>

      {nextUp ? (
        <ContinueFeature
          courseTitle={nextUp.course.title}
          category={nextUp.course.category}
          nextLessonTitle={nextUp.nextLesson.lesson.title}
          done={progressMap[nextUp.course.id]?.completedLessonIds.length ?? 0}
          total={courseLessonCount(nextUp.course)}
          minutes={courseDurationMinutes(nextUp.course)}
          icon={stepIcon(nextUp.course.pathwayOrder)}
          onContinue={() => router.push(`/learner/courses/${nextUp.course.id}`)}
          onBrowseCatalog={() => router.push('/learner/explore')}
        />
      ) : enrolledCourses.length > 0 ? (
        <ContinueEmptyState
          eyebrow="All caught up"
          heading="You’ve completed every lesson in your enrolled courses."
          body="Check your pathway below for what's next, or browse the Course Catalog for more of NFCAP's training library."
          ctaLabel="Browse Course Catalog"
          onCta={() => router.push('/learner/explore')}
        />
      ) : (
        <ContinueEmptyState
          eyebrow="Get started"
          heading="You’re not enrolled in any training yet."
          body="Your apprenticeship pathway starts with Safety & Tools. Enroll below to begin."
          ctaLabel="Browse Course Catalog"
          onCta={() => router.push('/learner/explore')}
        />
      )}

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-brand-heading">
            Your learning pathway
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Complete each step in order to build your skills and advance in your apprenticeship.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-text-muted">
            {enrolledCourses.length} of {pathway.length} courses started
          </span>
          <div className="hidden items-center gap-1.5 sm:flex">
            {pathway.map((course) => (
              <span
                key={course.id}
                className={cn(
                  'size-1.5 rounded-full',
                  progressMap[course.id]?.enrolled ? 'bg-brand-accent' : 'bg-border-default',
                )}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pathway.map((course) => (
            <PathwayCourseCard
              key={course.id}
              course={course}
              progress={progressMap[course.id]}
              isNextUp={nextUp?.course.id === course.id}
              unlocked={unlockedCourseSlugs.includes(course.id)}
            />
          ))}
        </div>
      </div>

      <AchievementStrip
        verifiedCount={credentials.length}
        totalCount={pathway.length}
        onViewPortfolio={() => router.push('/learner/portfolio')}
        onViewCertificates={() => router.push('/learner/certificates')}
      />
    </div>
  );
}

function ContinueFeature({
  courseTitle,
  category,
  nextLessonTitle,
  done,
  total,
  minutes,
  icon,
  onContinue,
  onBrowseCatalog,
}: {
  courseTitle: string;
  category: string;
  nextLessonTitle: string;
  done: number;
  total: number;
  minutes: number;
  icon: IconName;
  onContinue: () => void;
  onBrowseCatalog: () => void;
}) {
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-brand-primary-dark px-6 py-8 sm:px-8 sm:py-10"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1.5 bg-brand-accent lg:block"
      />
      <div className="relative flex flex-col gap-6">
        <span className="inline-flex w-fit items-center rounded-full bg-brand-accent px-3 py-1 text-xs font-semibold tracking-[0.08em] text-on-brand uppercase">
          Continue learning
        </span>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-white sm:flex">
              <Icon name={icon} className="size-6" />
            </div>
            <div className="flex max-w-lg flex-col gap-2">
              <span className="text-xs font-medium tracking-wide text-white/60 uppercase">
                {category}
              </span>
              <h2 className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-white sm:text-3xl">
                {courseTitle}
              </h2>
              <p className="text-sm text-white/70 sm:text-base">Next up: {nextLessonTitle}</p>
              <div className="flex items-center gap-3 text-xs text-white/60">
                <span className="inline-flex items-center gap-1">
                  <Icon name="book" className="size-3.5" />
                  {total} lessons
                </span>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" className="size-3.5" />
                  ~{minutes} min
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <div className="flex w-full max-w-[220px] flex-col gap-1.5">
              <span className="text-xs text-white/60">{percentage}% complete</span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-brand-accent transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <Button size="lg" onClick={onContinue} className="w-full sm:w-auto">
              Continue course
              <Icon name="arrow-right" className="size-4" />
            </Button>
            <button
              type="button"
              onClick={onBrowseCatalog}
              className="inline-flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white"
            >
              View course catalog
              <Icon name="arrow-right" className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContinueEmptyState({
  eyebrow,
  heading,
  body,
  ctaLabel,
  onCta,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-brand-primary-dark px-6 py-10 sm:px-10 sm:py-12"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }}
    >
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-xl flex-col gap-3">
          <span className="inline-flex w-fit items-center rounded-full bg-brand-accent px-3 py-1 text-xs font-semibold tracking-[0.08em] text-on-brand uppercase">
            {eyebrow}
          </span>
          <h2 className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-white sm:text-3xl">
            {heading}
          </h2>
          <p className="text-sm text-white/70 sm:text-base">{body}</p>
        </div>
        <Button size="lg" onClick={onCta} className="w-full shrink-0 sm:w-auto">
          {ctaLabel}
          <Icon name="arrow-right" className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function AchievementStrip({
  verifiedCount,
  totalCount,
  onViewPortfolio,
  onViewCertificates,
}: {
  verifiedCount: number;
  totalCount: number;
  onViewPortfolio: () => void;
  onViewCertificates: () => void;
}) {
  const percentage = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border-subtle bg-border-subtle sm:grid-cols-3">
      <div className="flex items-center gap-3 bg-bg-card p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-primary">
          <Icon name="bar-chart" className="size-5" />
        </span>
        <div className="flex flex-1 flex-col gap-1.5">
          <p className="text-sm font-semibold text-text-primary">Learning progress</p>
          <p className="text-xs text-text-secondary">
            {verifiedCount} of {totalCount} courses completed
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
            <div
              className="h-full rounded-full bg-brand-accent transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onViewPortfolio}
        className="group flex items-center gap-3 bg-bg-card p-5 text-left transition-colors hover:bg-bg-subtle"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-brand-accent">
          <Icon name="briefcase" className="size-5" />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-text-primary">View portfolio</p>
          <p className="text-xs text-text-secondary">See your completed work and achievements.</p>
        </div>
        <Icon
          name="arrow-right"
          className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5"
        />
      </button>

      <button
        type="button"
        onClick={onViewCertificates}
        className="group flex items-center gap-3 bg-bg-card p-5 text-left transition-colors hover:bg-bg-subtle"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-primary">
          <Icon name="award" className="size-5" />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-text-primary">Certificates</p>
          <p className="text-xs text-text-secondary">
            {verifiedCount > 0
              ? `Access your ${verifiedCount} earned certificate${verifiedCount === 1 ? '' : 's'}.`
              : 'Access your earned certificates.'}
          </p>
        </div>
        <Icon
          name="arrow-right"
          className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5"
        />
      </button>
    </div>
  );
}
