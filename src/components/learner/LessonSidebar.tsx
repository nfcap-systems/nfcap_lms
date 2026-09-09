'use client';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons';
import type { EvidenceStatus } from '@/lib/data/progress';
import { lessonTypeIcon } from './lesson-type';
import type { Course } from '@/lib/types';

export type CourseStepId = string | 'assessment' | 'evidence';

export function LessonSidebar({
  course,
  completedLessonIds,
  activeStepId,
  onSelectStep,
  allLessonsComplete,
  quizPassed,
  quizAttempted,
  evidenceStatus,
}: {
  course: Course;
  completedLessonIds: string[];
  activeStepId: CourseStepId;
  onSelectStep: (stepId: CourseStepId) => void;
  allLessonsComplete: boolean;
  quizPassed: boolean;
  quizAttempted: boolean;
  evidenceStatus: EvidenceStatus | undefined;
}) {
  const isLessonComplete = (lessonId: string) => completedLessonIds.includes(lessonId);

  return (
    <nav aria-label="Course sections" className="flex flex-col gap-5">
      {course.sections.map((section) => (
        <div key={section.id}>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {section.title}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {section.lessons.map((lesson) => {
              const active = lesson.id === activeStepId;
              const complete = isLessonComplete(lesson.id);
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStep(lesson.id)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      active
                        ? 'bg-brand-primary text-on-brand'
                        : 'text-text-secondary hover:bg-bg-subtle',
                    )}
                  >
                    {complete ? (
                      <Icon
                        name="check"
                        className={cn(
                          'size-4 shrink-0',
                          active ? 'text-on-brand' : 'text-status-success-text',
                        )}
                      />
                    ) : (
                      <Icon
                        name={lessonTypeIcon[lesson.type]}
                        className={cn(
                          'size-4 shrink-0',
                          active ? 'text-on-brand' : 'text-text-muted',
                        )}
                      />
                    )}
                    <span className="flex-1 truncate">{lesson.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Competency
        </h3>
        <ul className="flex flex-col gap-0.5">
          <StepItem
            label="Knowledge Assessment"
            icon="clipboard"
            active={activeStepId === 'assessment'}
            locked={!allLessonsComplete}
            state={quizPassed ? 'complete' : quizAttempted ? 'rejected' : 'none'}
            onClick={() => onSelectStep('assessment')}
          />
          <StepItem
            label="Practical Evidence"
            icon="paperclip"
            active={activeStepId === 'evidence'}
            locked={!quizPassed}
            state={
              evidenceStatus === 'approved'
                ? 'complete'
                : evidenceStatus === 'rejected'
                  ? 'rejected'
                  : evidenceStatus === 'pending'
                    ? 'pending'
                    : 'none'
            }
            onClick={() => onSelectStep('evidence')}
          />
        </ul>
      </div>
    </nav>
  );
}

function StepItem({
  label,
  icon,
  active,
  locked,
  state,
  onClick,
}: {
  label: string;
  icon: 'clipboard' | 'paperclip';
  active: boolean;
  locked: boolean;
  state: 'complete' | 'pending' | 'rejected' | 'none';
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={locked}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
          locked && 'cursor-not-allowed text-text-muted opacity-60',
          !locked && active && 'bg-brand-primary text-on-brand',
          !locked && !active && 'text-text-secondary hover:bg-bg-subtle',
        )}
      >
        {locked ? (
          <Icon name="lock" className="size-4 shrink-0 text-text-muted" />
        ) : state === 'complete' ? (
          <Icon
            name="check"
            className={cn('size-4 shrink-0', active ? 'text-on-brand' : 'text-status-success-text')}
          />
        ) : (
          <Icon
            name={icon}
            className={cn('size-4 shrink-0', active ? 'text-on-brand' : 'text-text-muted')}
          />
        )}
        <span className="flex-1 truncate">{label}</span>
        {!locked && state === 'pending' && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-status-pending-text"
            aria-hidden="true"
            title="Pending verification"
          />
        )}
        {!locked && state === 'rejected' && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-status-danger-text"
            aria-hidden="true"
            title="Needs attention"
          />
        )}
      </button>
    </li>
  );
}
