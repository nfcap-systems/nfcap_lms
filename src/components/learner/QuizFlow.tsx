'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge, Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { recordQuizAttempt } from '@/lib/actions/progress';
import type { QuizAttempt } from '@/lib/data/progress';
import type { Assessment, Course } from '@/lib/types';

type Step = 'pre' | 'question' | 'result';

/** LRN05-QuizPre → LRN05b-QuizQuestion → LRN05c-QuizResult as discrete steps, replacing the old
 * QuizView's single scrollable all-questions-at-once form. Only the question step is chromeless
 * (board has no LearnerHeader there at all) — implemented as a fixed overlay covering the shared
 * header rather than a route restructure (docs/build/LRN_BATCH_DRIFT.md).
 *
 * Question bank draw/shuffle (Assessment.questionsPerAttempt/randomizeOrder) exist as schema
 * fields (Layer 1) but nothing reads them yet — this flow still shows every question in fixed
 * order, same as before. That wiring is still open, not something this pass adds. `maxAttempts`
 * is now read here too (see `canRevealAnswers` below, fixing the answer-leakage regression from
 * docs/build/CODE_VERIFICATION_AUDIT_2026-11-25.md) — the server already enforced the attempt cap
 * (`recordQuizAttempt`), this was only ever a result-screen display gap. */
export function QuizFlow({
  course,
  assessment,
  lastAttempt,
  attemptCount,
}: {
  course: Course;
  assessment: Assessment;
  lastAttempt: QuizAttempt | undefined;
  /** Attempts persisted before this page load — does not include whatever attempt the learner is
   * about to submit in this session (see `attemptsUsedAfterThisOne` below). */
  attemptCount: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [step, setStep] = useState<Step>(lastAttempt ? 'result' : 'pre');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Only set once the learner finishes a quiz in THIS session — a persisted attempt loaded fresh
  // from the DB has no per-question answers to review (recordQuizAttempt only stores the score).
  const [sessionResult, setSessionResult] = useState<{
    scorePercent: number;
    passed: boolean;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = assessment.questions.length;
  const question = assessment.questions[questionIndex];
  const selected = question ? answers[question.id] : undefined;

  function startQuiz() {
    setAnswers({});
    setQuestionIndex(0);
    setSubmitError(null);
    setStep('question');
  }

  function selectOption(optionIndex: number) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
  }

  function nextQuestion() {
    if (questionIndex < total - 1) {
      setQuestionIndex((i) => i + 1);
      return;
    }
    const correct = assessment.questions.filter((q) => answers[q.id] === q.correctIndex).length;
    const scorePercent = Math.round((correct / total) * 100);
    const passed = correct / total >= assessment.passThreshold;
    startTransition(async () => {
      try {
        await recordQuizAttempt(course.id, scorePercent, passed);
        setSessionResult({ scorePercent, passed });
        setStep('result');
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not submit the quiz.';
        setSubmitError(message);
        toast.error(message);
        setStep('result');
      }
    });
  }

  if (step === 'question' && question) {
    const progressPercent = Math.round(((questionIndex + 1) / total) * 100);
    return (
      <div className="lrn-quiz-overlay">
        <div className="lrn-quiz-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'var(--nfcap-accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="shield" className="h-4 w-4" />
            </span>
            <span
              style={{
                fontFamily: 'Geist, sans-serif',
                fontWeight: 700,
                fontSize: 16.5,
                color: 'var(--ink)',
              }}
            >
              NFCAP
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            aria-label="Exit quiz"
            onClick={() => router.push(`/learner/courses/${course.id}`)}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--ink-muted)',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="x" className="h-3.5 w-3.5" />
            Exit quiz
          </button>
        </div>

        <div
          style={{
            maxWidth: 680,
            margin: '0 auto',
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--ink-muted)',
                marginBottom: 8,
              }}
            >
              <span>
                Question {questionIndex + 1} of {total}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--nfcap-border)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'var(--nfcap-accent)',
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.4, color: 'var(--ink)' }}>
            {question.prompt}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {question.options.map((option, oi) => (
              <button
                key={oi}
                type="button"
                className={cn('quizopt', selected === oi && 'selected')}
                onClick={() => selectOption(oi)}
              >
                <span className="quizradio" />
                {option}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="lg" disabled={selected === undefined} onClick={nextQuestion}>
              {questionIndex < total - 1 ? 'Next question' : 'See results'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'result') {
    const scorePercent = sessionResult?.scorePercent ?? lastAttempt?.scorePercent ?? 0;
    const passed = sessionResult?.passed ?? lastAttempt?.passed ?? false;
    const correctCount = sessionResult ? Math.round((scorePercent / 100) * total) : undefined;

    // QuizFlow previously revealed the correct answer on every result screen regardless of
    // attempts remaining (docs/build/CODE_VERIFICATION_AUDIT_2026-11-25.md, Phase 6 "Quiz Engine
    // Depth" finding) — a failed attempt with retakes left let a learner just memorize the right
    // choice instead of actually retrying. `attemptCount` is attempts persisted before this page
    // load; `sessionResult` only exists once this session's own attempt has already been recorded
    // (recordQuizAttempt), so +1 accounts for it without waiting on a server round-trip to refresh
    // the prop. Unlimited attempts (`maxAttempts === null`) never run out, so answers only ever
    // reveal once the learner has actually passed.
    const attemptsUsedAfterThisOne = attemptCount + (sessionResult ? 1 : 0);
    const attemptsRemaining =
      assessment.maxAttempts === null ? null : assessment.maxAttempts - attemptsUsedAfterThisOne;
    const canRevealAnswers = passed || (attemptsRemaining !== null && attemptsRemaining <= 0);

    return (
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {submitError && (
          <div
            style={{
              background: 'var(--status-problem-bg)',
              color: 'var(--status-problem)',
              border: '1px solid var(--status-problem)',
              borderRadius: 'var(--nfcap-radius-lg)',
              padding: 16,
              fontSize: 13.5,
            }}
          >
            {submitError}
          </div>
        )}

        <div
          style={{
            background: 'var(--surface)',
            border: `1px solid ${passed ? 'var(--status-complete-border)' : 'var(--status-problem)'}`,
            borderRadius: 'var(--nfcap-radius-lg)',
            boxShadow: 'var(--nfcap-shadow-sm)',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: passed ? 'var(--status-complete-bg)' : 'var(--status-problem-bg)',
              color: passed ? 'var(--status-complete)' : 'var(--status-problem)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={passed ? 'check' : 'x'} className="h-6 w-6" />
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--ink)',
            }}
          >
            {passed
              ? correctCount !== undefined
                ? `You passed — ${correctCount} of ${total}`
                : 'You passed'
              : 'Not passed yet'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-muted)' }}>
            {scorePercent}% · pass mark was {Math.round(assessment.passThreshold * 100)}%
          </div>
          <Badge tone={passed ? 'success' : 'danger'} style={{ marginTop: 4 }}>
            {passed ? 'Module Quiz Complete' : 'Not passed'}
          </Badge>
        </div>

        {sessionResult && (
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
                padding: '16px 18px',
                borderBottom: '1px solid var(--nfcap-border)',
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--ink)',
              }}
            >
              Review your answers
            </div>
            {assessment.questions.map((q) => {
              const isCorrect = answers[q.id] === q.correctIndex;
              return (
                <div
                  key={q.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--nfcap-border)',
                    fontSize: 13.5,
                  }}
                >
                  <Icon
                    name={isCorrect ? 'check' : 'x'}
                    className="h-4 w-4"
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                      color: isCorrect ? 'var(--status-complete)' : 'var(--status-problem)',
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{q.prompt}</div>
                    <div
                      style={{
                        color: isCorrect ? 'var(--ink-muted)' : 'var(--status-problem)',
                        marginTop: 2,
                      }}
                    >
                      Your answer: {q.options[answers[q.id]] ?? '—'}
                    </div>
                    {!isCorrect && canRevealAnswers && (
                      <div style={{ color: 'var(--status-complete)', marginTop: 2 }}>
                        Correct answer: {q.options[q.correctIndex]}
                      </div>
                    )}
                    {!isCorrect && !canRevealAnswers && (
                      <div style={{ color: 'var(--ink-muted)', marginTop: 2, fontStyle: 'italic' }}>
                        Correct answer hidden —{' '}
                        {attemptsRemaining !== null
                          ? `${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining`
                          : 'retake the quiz to improve your score'}
                        .
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-2.5">
          {!passed && (
            <Button
              variant="secondary"
              className="sm:flex-1"
              style={{ justifyContent: 'center' }}
              onClick={startQuiz}
            >
              Retake quiz
            </Button>
          )}
          {passed ? (
            <Button
              className="sm:flex-1"
              style={{ justifyContent: 'center' }}
              onClick={() => router.push(`/learner/courses/${course.id}/evidence`)}
            >
              Continue to Practical Evidence
            </Button>
          ) : (
            <Button
              variant="outline"
              className="sm:flex-1"
              style={{ justifyContent: 'center' }}
              onClick={() => router.push(`/learner/courses/${course.id}`)}
            >
              Back to {course.title}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // step === 'pre'
  return (
    <div
      style={{
        maxWidth: 620,
        margin: '0 auto',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--nfcap-accent)',
        }}
      >
        <Icon name="clipboard" className="h-6 w-6" />
      </div>

      <div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{course.title}</div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            marginTop: 4,
            color: 'var(--ink)',
          }}
        >
          Module Quiz
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--nfcap-border)',
          borderRadius: 'var(--nfcap-radius-lg)',
          boxShadow: 'var(--nfcap-shadow-sm)',
          padding: '8px 28px',
          width: '100%',
          maxWidth: 400,
          textAlign: 'left',
        }}
      >
        <div className="quizfact">
          <Icon name="list" className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
          <span style={{ flex: 1, color: 'var(--ink-muted)' }}>Questions</span>
          <span style={{ fontWeight: 600 }}>{total}</span>
        </div>
        <div className="quizfact">
          <Icon name="check" className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
          <span style={{ flex: 1, color: 'var(--ink-muted)' }}>Pass mark</span>
          <span style={{ fontWeight: 600 }}>{Math.round(assessment.passThreshold * 100)}%</span>
        </div>
        <div className="quizfact">
          <Icon name="numbered-list" className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
          <span style={{ flex: 1, color: 'var(--ink-muted)' }}>Attempts</span>
          <span style={{ fontWeight: 600 }}>
            {assessment.maxAttempts === null ? 'Unlimited' : assessment.maxAttempts}
          </span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-muted)', maxWidth: 420 }}>
        One question at a time — you can&apos;t go back to change an answer once you move on.
        You&apos;ll see your score and which ones you missed right after submitting.
      </p>

      <Button size="lg" onClick={startQuiz}>
        {lastAttempt ? 'Retake quiz' : 'Start quiz'}
      </Button>
    </div>
  );
}
