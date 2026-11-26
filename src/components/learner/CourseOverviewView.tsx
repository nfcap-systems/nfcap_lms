'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { Badge, Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import { enroll } from '@/lib/actions/progress';
import { courseDurationMinutes, courseLessonCount, flattenLessons } from '@/lib/types';
import type { Course } from '@/lib/types';
import type { CourseProgress } from '@/lib/data/progress';
import { RestrictedCourseNotice } from './RestrictedCourseNotice';

const HERO_PHOTOS = [
  '/images/learner/safety-tools.jpg',
  '/images/learner/flooring-fundamentals.jpg',
  '/images/learner/tile-installation.jpg',
];

type NextStep =
  | { kind: 'lesson'; lessonId: string; label: string }
  | { kind: 'quiz'; label: string }
  | { kind: 'evidence'; label: string };

/** LRN03-CourseOverview — the landing screen for an enrolled course, replacing the old combined
 * CourseLearningView. Every "go to this course" link app-wide already points at the bare
 * `/learner/courses/[courseId]` URL, so this becomes the one place that decides what's next
 * (lesson / quiz / evidence) rather than a route of its own per concern colliding with this one. */
export function CourseOverviewView({
  course,
  progress,
  unlocked,
  moduleNumber,
  moduleTotal,
  previewMode = false,
}: {
  course: Course;
  progress: CourseProgress | undefined;
  unlocked: boolean;
  moduleNumber: number;
  moduleTotal: number;
  /** Admin's "Preview as Learner" (src/app/admin/courses/[courseId]/page.tsx), role-gated in the
   * page above this component — bypasses the restricted-course gate below (the one case the plain
   * learner link always failed on, since the admin's own account never holds a CourseUnlock) and
   * disables the one remaining write action here, the Enroll button. Lessons/quiz already render
   * inert in this mode with no extra code: `canOpen`/the quiz row's disabled check both key off
   * `enrolled`, which is already false for an admin who was never actually enrolled. */
  previewMode?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const enrolled = Boolean(progress?.enrolled);
  const completedLessonIds = progress?.completedLessonIds ?? [];
  const flat = flattenLessons(course);
  const total = courseLessonCount(course);
  const done = completedLessonIds.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const allLessonsComplete = enrolled && total > 0 && done === total;
  const quizPassed = Boolean(progress?.quizAttempt?.passed);
  const evidence = progress?.evidence;
  const hero = HERO_PHOTOS[course.pathwayOrder % HERO_PHOTOS.length];

  function handleEnroll() {
    startTransition(async () => {
      try {
        await enroll(course.id);
        toast.success(`Enrolled in ${course.title}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not enroll in this course.');
      }
    });
  }

  // Gated on the course's access rule alone, same as `getOrCreateEnrollment`
  // (src/lib/actions/progress.ts) — NOT on `enrolled`, since a learner can hold a stale Enrollment
  // row from before this restriction existed (or from an admin demo flow) and must still be locked
  // out here, or they reach the lesson/quiz/evidence routes only to have every write there throw.
  if (course.access === 'restricted' && !unlocked && !previewMode) {
    return <RestrictedCourseNotice courseTitle={course.title} />;
  }

  let nextStep: NextStep | null = null;
  if (enrolled) {
    const nextLesson = flat.find((f) => !completedLessonIds.includes(f.lesson.id));
    if (nextLesson) {
      nextStep = { kind: 'lesson', lessonId: nextLesson.lesson.id, label: nextLesson.lesson.title };
    } else if (!quizPassed) {
      nextStep = { kind: 'quiz', label: 'Module Quiz' };
    } else if (!evidence || evidence.status === 'rejected') {
      nextStep = { kind: 'evidence', label: 'Practical Evidence' };
    }
  }

  function goToNextStep() {
    if (!nextStep) return;
    if (nextStep.kind === 'lesson')
      router.push(`/learner/courses/${course.id}/learn/${nextStep.lessonId}`);
    else if (nextStep.kind === 'quiz') router.push(`/learner/courses/${course.id}/quiz`);
    else router.push(`/learner/courses/${course.id}/evidence`);
  }

  const hours = Math.round((courseDurationMinutes(course) / 60) * 10) / 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {previewMode && (
        <div
          className="flex-wrap"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--nfcap-radius-lg)',
            padding: '10px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#1e3a8a',
          }}
        >
          <Icon name="alert-circle" className="h-4 w-4" style={{ flexShrink: 0 }} />
          <span>
            <b>Previewing as Learner</b> — read-only, nothing you do here is saved.
          </span>
          <Link
            href={`/admin/courses/${course.id}`}
            style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Exit preview ✕
          </Link>
        </div>
      )}
      {/* Hero */}
      <div
        className="h-[200px] sm:h-[280px]"
        style={{
          position: 'relative',
          borderRadius: 'var(--nfcap-radius-lg)',
          overflow: 'hidden',
          marginBottom: 28,
        }}
      >
        <Image src={hero} alt="" fill style={{ objectFit: 'cover' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(10,12,16,0.35) 0%, rgba(10,12,16,0.85) 100%)',
          }}
        />
        <div
          className="px-4 pb-4 sm:px-7 sm:pb-6"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              {course.category} <span style={{ opacity: 0.6 }}>/</span> Module {moduleNumber} of{' '}
              {moduleTotal}
            </div>
            <div
              className="text-2xl sm:text-[30px]"
              style={{
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: '#fff',
                lineHeight: 1.1,
              }}
            >
              {course.title}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
              <MetaChip icon="clock">{hours}h total</MetaChip>
              <MetaChip icon="book">{total} lessons</MetaChip>
              <MetaChip icon="clipboard">1 practical evidence submission</MetaChip>
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid-cols-1 lg:grid-cols-[2fr_1fr]"
        style={{ display: 'grid', gap: 32, alignItems: 'start' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)' }}>
            {course.description}
          </p>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--nfcap-border)',
              borderRadius: 'var(--nfcap-radius-lg)',
              boxShadow: 'var(--nfcap-shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>Lessons</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                {done} of {total} complete
              </span>
            </div>
            {course.sections.map((section) => (
              <div key={section.id}>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--ink-muted)',
                    padding: '14px 20px 8px',
                  }}
                >
                  {section.title}
                </div>
                {section.lessons.map((lesson) => {
                  const complete = completedLessonIds.includes(lesson.id);
                  const canOpen = enrolled;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      disabled={!canOpen}
                      onClick={() =>
                        router.push(`/learner/courses/${course.id}/learn/${lesson.id}`)
                      }
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: 12,
                        padding: '13px 20px',
                        fontSize: 13.5,
                        background: 'none',
                        border: 'none',
                        borderTopWidth: 1,
                        borderTopStyle: 'solid',
                        borderTopColor: 'var(--nfcap-border)',
                        textAlign: 'left',
                        cursor: canOpen ? 'pointer' : 'default',
                        color: 'var(--ink)',
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: complete
                            ? 'var(--status-complete-bg)'
                            : 'var(--surface-muted)',
                          color: complete ? 'var(--status-complete)' : 'var(--ink-muted)',
                        }}
                      >
                        <Icon name={complete ? 'check' : 'play'} className="h-3.5 w-3.5" />
                      </span>
                      <span
                        style={{ flex: 1, color: complete ? 'var(--ink)' : 'var(--ink-muted)' }}
                      >
                        {lesson.title}
                      </span>
                      <span style={{ color: 'var(--ink-muted)' }}>
                        {lesson.durationMinutes} min
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            <button
              type="button"
              disabled={!enrolled || !allLessonsComplete}
              onClick={() => router.push(`/learner/courses/${course.id}/quiz`)}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                gap: 12,
                padding: '13px 20px',
                fontSize: 13.5,
                background: 'none',
                border: 'none',
                borderTopWidth: 1,
                borderTopStyle: 'solid',
                borderTopColor: 'var(--nfcap-border)',
                textAlign: 'left',
                cursor: enrolled && allLessonsComplete ? 'pointer' : 'default',
                color: 'var(--ink)',
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: quizPassed ? 'var(--status-complete-bg)' : 'var(--surface-muted)',
                  color: quizPassed ? 'var(--status-complete)' : 'var(--ink-muted)',
                }}
              >
                <Icon
                  name={quizPassed ? 'check' : allLessonsComplete ? 'clipboard' : 'lock'}
                  className="h-3.5 w-3.5"
                />
              </span>
              <span style={{ flex: 1, color: 'var(--ink-muted)' }}>Quiz</span>
              <span style={{ color: 'var(--ink-muted)' }}>
                {course.assessment.questions.length} questions
              </span>
            </button>
          </div>
        </div>

        <div
          className="lg:sticky lg:top-[84px]"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--nfcap-border)',
              borderRadius: 'var(--nfcap-radius-lg)',
              boxShadow: 'var(--nfcap-shadow-sm)',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {enrolled ? (
              <>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: 'var(--ink-muted)',
                    }}
                  >
                    <span>Your progress</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{percent}%</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: 'var(--nfcap-border)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                      marginTop: 8,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: 'var(--nfcap-accent)',
                      }}
                    />
                  </div>
                </div>
                {nextStep ? (
                  <Button
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={goToNextStep}
                  >
                    Continue — {nextStep.label}
                  </Button>
                ) : (
                  <Badge tone="success" style={{ width: 'fit-content' }}>
                    <Icon name="check" className="h-3 w-3" />
                    Course complete
                  </Badge>
                )}
              </>
            ) : previewMode ? (
              <Button style={{ width: '100%', justifyContent: 'center' }} disabled>
                Preview only — not enrolled
              </Button>
            ) : (
              <Button style={{ width: '100%', justifyContent: 'center' }} onClick={handleEnroll}>
                Enroll in Course
                <Icon name="arrow-right" className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mentor stays "Not yet assigned" — no mentor-assignment model exists in
              prisma/schema.prisma (docs/build/LRN01_HOME_DRIFT.md point 1). */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--nfcap-border)',
              borderRadius: 'var(--nfcap-radius-lg)',
              boxShadow: 'var(--nfcap-shadow-sm)',
              padding: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--surface-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-muted)',
                flexShrink: 0,
              }}
            >
              <Icon name="user" className="h-4.5 w-4.5" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Your mentor</div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Not yet assigned</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaChip({
  icon,
  children,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        color: '#e5e7eb',
      }}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
