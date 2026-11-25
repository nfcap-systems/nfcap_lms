'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge, Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { markLessonComplete } from '@/lib/actions/progress';
import { flattenLessons } from '@/lib/types';
import type { Course } from '@/lib/types';
import { LessonContent } from './LessonContent';

/** LRN04-Player — a discrete screen per lesson (`/learner/courses/[courseId]/learn/[lessonId]`).
 * The board's own sidebar lists Quiz as the last row after every lesson, so it's appended here
 * too rather than left as a lesson-only list. */
export function LessonPlayerView({
  course,
  lessonId,
  completedLessonIds,
  quizPassed,
}: {
  course: Course;
  lessonId: string;
  completedLessonIds: string[];
  quizPassed: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const flat = flattenLessons(course);
  const activeIndex = flat.findIndex((f) => f.lesson.id === lessonId);
  const active = flat[activeIndex];
  const isComplete = active ? completedLessonIds.includes(active.lesson.id) : false;
  const allLessonsComplete =
    flat.length > 0 && flat.every((f) => completedLessonIds.includes(f.lesson.id));

  if (!active) return null;

  function handleMarkComplete() {
    setError(null);
    startTransition(async () => {
      try {
        await markLessonComplete(course.id, active.lesson.id);
        toast.success('Lesson marked complete');
        router.refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Something went wrong.';
        setError(message);
        toast.error(message);
      }
    });
  }

  const prev = flat[activeIndex - 1];
  const next = flat[activeIndex + 1];

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
          <Link href={`/learner/courses/${course.id}`} style={{ color: 'var(--ink-muted)' }}>
            {course.title}
          </Link>{' '}
          <span style={{ margin: '0 6px' }}>›</span> Lesson {activeIndex + 1} of {flat.length}
        </div>

        {/* LRN04-Player puts a video lesson's player first, then its title/description in a
            separate card below — the opposite order from LessonContent's generic reading layout
            (badge+title, then blocks), which still applies as-is to non-video lesson types. */}
        {active.lesson.type === 'video' && active.lesson.blocks[0]?.url ? (
          <>
            <div
              style={{
                position: 'relative',
                borderRadius: 'var(--nfcap-radius-lg)',
                overflow: 'hidden',
                aspectRatio: '16 / 9',
                boxShadow: 'var(--nfcap-shadow-md)',
              }}
            >
              <video
                controls
                className="h-full w-full"
                style={{ display: 'block', background: '#000' }}
                src={active.lesson.blocks[0].url}
              />
            </div>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--nfcap-border)',
                borderRadius: 'var(--nfcap-radius-lg)',
                padding: 24,
              }}
            >
              <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>
                {active.lesson.title}
              </div>
              {active.lesson.blocks[0].content && (
                <div style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                  {active.lesson.blocks[0].content}
                </div>
              )}
            </div>
          </>
        ) : (
          <LessonContent lesson={active.lesson} />
        )}

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--status-problem)' }} role="alert">
            {error}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderTop: '1px solid var(--nfcap-border)',
            paddingTop: 20,
          }}
        >
          <Button
            variant="outline"
            size="sm"
            disabled={!prev}
            onClick={() =>
              prev && router.push(`/learner/courses/${course.id}/learn/${prev.lesson.id}`)
            }
          >
            Previous lesson
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isComplete ? (
              <Badge tone="success">
                <Icon name="check" className="h-3 w-3" />
                Completed
              </Badge>
            ) : (
              <Button size="sm" onClick={handleMarkComplete}>
                <Icon name="check" className="h-4 w-4" />
                Mark as Complete
              </Button>
            )}

            {next ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/learner/courses/${course.id}/learn/${next.lesson.id}`)}
              >
                Next lesson
                <Icon name="arrow-right" className="h-4 w-4" />
              </Button>
            ) : (
              isComplete &&
              allLessonsComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/learner/courses/${course.id}/quiz`)}
                >
                  Start Quiz
                  <Icon name="arrow-right" className="h-4 w-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          width: 300,
          flexShrink: 0,
          position: 'sticky',
          top: 84,
          background: 'var(--surface)',
          border: '1px solid var(--nfcap-border)',
          borderRadius: 'var(--nfcap-radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--nfcap-border)',
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--ink)',
          }}
        >
          Lessons
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: 8 }}>
          {flat.map((f) => {
            const complete = completedLessonIds.includes(f.lesson.id);
            const isActive = f.lesson.id === lessonId;
            return (
              <button
                key={f.lesson.id}
                type="button"
                onClick={() => router.push(`/learner/courses/${course.id}/learn/${f.lesson.id}`)}
                className={cn('lrn-player-row', isActive && 'on')}
              >
                {complete ? (
                  <Icon
                    name="check"
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--status-complete)' }}
                  />
                ) : (
                  <span style={{ fontSize: 12, width: 14, textAlign: 'center' }}>
                    {f.index + 1}
                  </span>
                )}
                <span style={{ flex: 1, textAlign: 'left' }}>{f.lesson.title}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => router.push(`/learner/courses/${course.id}/quiz`)}
            className="lrn-player-row"
          >
            {quizPassed ? (
              <Icon
                name="check"
                className="h-3.5 w-3.5"
                style={{ color: 'var(--status-complete)' }}
              />
            ) : (
              <Icon name="clipboard" className="h-3.5 w-3.5" />
            )}
            <span style={{ flex: 1, textAlign: 'left' }}>Quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
}
