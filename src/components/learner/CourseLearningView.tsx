'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/icons';
import { enroll, markLessonComplete } from '@/lib/actions/progress';
import type { CourseProgress } from '@/lib/data/progress';
import { courseDurationMinutes, courseLessonCount, flattenLessons, type Course } from '@/lib/types';
import { LessonSidebar, type CourseStepId } from './LessonSidebar';
import { LessonContent } from './LessonContent';
import { QuizView } from './QuizView';
import { EvidenceView } from './EvidenceView';
import { lessonTypeIcon } from './lesson-type';

export function CourseLearningView({
  course,
  progress,
  unlocked = false,
}: {
  course: Course;
  progress: CourseProgress | undefined;
  /** A RESTRICTED course this learner has a CourseUnlock for (WIOA funding approved, or an Admin
   * grant) — self-enrollment opens up exactly as for an OPEN course. */
  unlocked?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const enrolled = Boolean(progress?.enrolled);
  const completedLessonIds = progress?.completedLessonIds ?? [];
  const isLessonComplete = (lessonId: string) => completedLessonIds.includes(lessonId);

  const flat = useMemo(() => flattenLessons(course), [course]);

  const total = courseLessonCount(course);
  const done = completedLessonIds.length;
  const allLessonsComplete = enrolled && done === total;
  const quizAttempt = progress?.quizAttempt;
  const quizPassed = Boolean(quizAttempt?.passed);
  const evidence = progress?.evidence;

  const firstIncomplete = flat.find((f) => !isLessonComplete(f.lesson.id));
  const initialStepId: CourseStepId = firstIncomplete
    ? firstIncomplete.lesson.id
    : !quizPassed
      ? 'assessment'
      : !evidence
        ? 'evidence'
        : (flat[flat.length - 1]?.lesson.id ?? 'evidence');
  const [activeStepId, setActiveStepId] = useState<CourseStepId>(initialStepId);

  const activeIndex = flat.findIndex((f) => f.lesson.id === activeStepId);
  const active = flat[activeIndex];
  const isActiveComplete = active ? isLessonComplete(active.lesson.id) : false;

  function handleEnroll() {
    startTransition(async () => {
      await enroll(course.id);
      router.refresh();
    });
  }

  function handleMarkComplete(lessonId: string) {
    startTransition(async () => {
      await markLessonComplete(course.id, lessonId);
      router.refresh();
    });
  }

  if (!enrolled && course.access === 'restricted' && !unlocked) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-10">
          <div className="flex size-10 items-center justify-center rounded-full bg-status-restricted-bg text-status-restricted-text">
            <Icon name="lock" className="size-5" />
          </div>
          <Badge tone="restricted">Restricted</Badge>
          <h2 className="text-lg font-semibold text-brand-heading">{course.title}</h2>
          <p className="max-w-md text-sm text-text-secondary">
            This course is assigned by NFCAP staff based on your program placement and prior
            progress. It isn&apos;t open for self-enrollment yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!enrolled) {
    const hours = Math.round((courseDurationMinutes(course) / 60) * 10) / 10;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-4">
          <p className="max-w-2xl text-sm text-text-secondary">{course.description}</p>
          <p className="text-xs text-text-muted">
            {course.sections.length} sections · {total} lessons · {hours}h
          </p>
          <Button size="lg" onClick={handleEnroll}>
            Enroll in Course
            <Icon name="arrow-right" className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <h2 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                Curriculum
              </h2>
              {course.sections.map((section) => (
                <div key={section.id}>
                  <h3 className="mb-2 text-sm font-semibold text-brand-heading">{section.title}</h3>
                  <ul className="flex flex-col divide-y divide-border-subtle">
                    {section.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center gap-3 py-2.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border-default text-text-muted">
                          <Icon name={lessonTypeIcon[lesson.type]} className="size-3" />
                        </span>
                        <span className="flex-1 text-sm text-text-primary">{lesson.title}</span>
                        <span className="text-xs text-text-muted">
                          {lesson.durationMinutes} min
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardContent className="flex flex-col gap-5">
              <h2 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                Competency
              </h2>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-text-primary">Knowledge Assessment</p>
                <p className="text-xs text-text-secondary">
                  {course.assessment.questions.length} questions &middot;{' '}
                  {Math.round(course.assessment.passThreshold * 100)}% to pass
                </p>
              </div>
              <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-4">
                <p className="text-sm font-medium text-text-primary">Practical Evidence</p>
                <p className="text-xs text-text-secondary">{course.evidencePrompt}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!active && activeStepId !== 'assessment' && activeStepId !== 'evidence') return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit lg:sticky lg:top-6">
        <CardContent className="flex flex-col gap-4">
          <ProgressBar
            value={done}
            max={total}
            label={`${done} of ${total} lessons`}
            showPercentage
          />
          <LessonSidebar
            course={course}
            completedLessonIds={completedLessonIds}
            activeStepId={activeStepId}
            onSelectStep={setActiveStepId}
            allLessonsComplete={allLessonsComplete}
            quizPassed={quizPassed}
            quizAttempted={Boolean(quizAttempt)}
            evidenceStatus={evidence?.status}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-6">
          {activeStepId === 'assessment' ? (
            <QuizView
              course={course}
              assessment={course.assessment}
              quizAttempt={quizAttempt}
              onContinue={() => setActiveStepId('evidence')}
            />
          ) : activeStepId === 'evidence' ? (
            <EvidenceView course={course} evidence={evidence} />
          ) : (
            active && (
              <>
                <LessonContent lesson={active.lesson} />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activeIndex <= 0}
                    onClick={() =>
                      flat[activeIndex - 1] && setActiveStepId(flat[activeIndex - 1].lesson.id)
                    }
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {isActiveComplete ? (
                      <Badge tone="success">
                        <Icon name="check" className="size-3" />
                        Completed
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleMarkComplete(active.lesson.id)}>
                        <Icon name="check" className="size-4" />
                        Mark as Complete
                      </Button>
                    )}

                    {activeIndex < flat.length - 1 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveStepId(flat[activeIndex + 1].lesson.id)}
                      >
                        Next Lesson
                        <Icon name="arrow-right" className="size-4" />
                      </Button>
                    ) : (
                      isActiveComplete &&
                      done === total && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveStepId('assessment')}
                        >
                          Start Knowledge Assessment
                          <Icon name="arrow-right" className="size-4" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
