'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { recordQuizAttempt } from '@/lib/actions/progress';
import type { QuizAttempt } from '@/lib/data/progress';
import type { Assessment, Course } from '@/lib/types';

type Mode = 'summary' | 'taking' | 'results';

export function QuizView({
  course,
  assessment,
  quizAttempt: attempt,
  onContinue,
}: {
  course: Course;
  assessment: Assessment;
  quizAttempt: QuizAttempt | undefined;
  onContinue: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>(attempt ? 'summary' : 'taking');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [lastScorePercent, setLastScorePercent] = useState<number | null>(null);

  const allAnswered = assessment.questions.every((q) => answers[q.id] !== undefined);

  function startTaking() {
    setAnswers({});
    setMode('taking');
  }

  function submit() {
    const correct = assessment.questions.filter((q) => answers[q.id] === q.correctIndex).length;
    const scorePercent = Math.round((correct / assessment.questions.length) * 100);
    const passed = correct / assessment.questions.length >= assessment.passThreshold;
    startTransition(async () => {
      await recordQuizAttempt(course.id, scorePercent, passed);
      router.refresh();
    });
    setLastScorePercent(scorePercent);
    setMode('results');
  }

  if (mode === 'summary' && attempt) {
    return (
      <div className="flex flex-col gap-5">
        <Header title="Knowledge Assessment" />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <Badge tone={attempt.passed ? 'success' : 'danger'}>
            {attempt.passed ? 'Passed' : 'Not passed yet'}
          </Badge>
          <p className="text-sm text-[var(--ink-muted)]">
            Your last score was{' '}
            <span className="font-medium text-[var(--ink)]">{attempt.scorePercent}%</span>.
          </p>
          <div className="flex gap-2 pt-1">
            {attempt.passed ? (
              <Button size="sm" onClick={onContinue}>
                Continue to Practical Evidence
                <Icon name="arrow-right" className="size-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={startTaking}>
                Retake Quiz
              </Button>
            )}
            {attempt.passed && (
              <Button size="sm" variant="outline" onClick={startTaking}>
                Retake Quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'results') {
    const correctCount = assessment.questions.filter(
      (q) => answers[q.id] === q.correctIndex,
    ).length;
    const passed = correctCount / assessment.questions.length >= assessment.passThreshold;
    return (
      <div className="flex flex-col gap-5">
        <Header title="Knowledge Assessment Results" />
        <div className="flex flex-col items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <Badge tone={passed ? 'success' : 'danger'}>{passed ? 'Passed' : 'Not passed'}</Badge>
          <p className="text-sm text-[var(--ink-muted)]">
            You scored <span className="font-medium text-[var(--ink)]">{lastScorePercent}%</span> (
            {correctCount} of {assessment.questions.length} correct). A score of{' '}
            {Math.round(assessment.passThreshold * 100)}% or higher is required to pass.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {assessment.questions.map((q, i) => {
            const selected = answers[q.id];
            const isCorrect = selected === q.correctIndex;
            return (
              <div key={q.id} className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-sm font-medium text-[var(--ink)]">
                  {i + 1}. {q.prompt}
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {q.options.map((option, oi) => (
                    <div
                      key={oi}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm',
                        oi === q.correctIndex && 'bg-[var(--status-complete-bg)] text-[var(--status-complete)]',
                        oi === selected &&
                          oi !== q.correctIndex &&
                          'bg-[var(--status-problem-bg)] text-[var(--status-problem)]',
                      )}
                    >
                      {oi === q.correctIndex && <Icon name="check" className="size-3.5 shrink-0" />}
                      {oi === selected && oi !== q.correctIndex && (
                        <Icon name="x" className="size-3.5 shrink-0" />
                      )}
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
                {!isCorrect && (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">Your answer wasn&apos;t correct.</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 border-t border-[var(--border)] pt-5">
          {passed ? (
            <Button size="sm" onClick={onContinue}>
              Continue to Practical Evidence
              <Icon name="arrow-right" className="size-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={startTaking}>
              Retake Quiz
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Header title="Knowledge Assessment" />
      <p className="text-sm text-[var(--ink-muted)]">
        Answer all {assessment.questions.length} questions, then submit. You&apos;ll need{' '}
        {Math.round(assessment.passThreshold * 100)}% or higher to pass.
      </p>

      <div className="flex flex-col gap-4">
        {assessment.questions.map((q, i) => (
          <fieldset key={q.id} className="rounded-xl border border-[var(--border)] p-4">
            <legend className="px-1 text-sm font-medium text-[var(--ink)]">
              {i + 1}. {q.prompt}
            </legend>
            <div className="mt-2 flex flex-col gap-1.5">
              {q.options.map((option, oi) => (
                <label
                  key={oi}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                    answers[q.id] === oi
                      ? 'bg-[var(--accent)]/10 text-[var(--ink)]'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]',
                  )}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === oi}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                    className="size-4 text-[var(--accent)] focus:ring-2 focus:ring-brand-primary/20"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="border-t border-[var(--border)] pt-5">
        <Button disabled={!allAnswered} onClick={submit}>
          Submit Assessment
        </Button>
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
      <Badge tone="info">
        <Icon name="clipboard" className="size-3" />
        {title}
      </Badge>
    </div>
  );
}
