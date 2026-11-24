'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { StateCard } from '@/components/ui';
import type { EligibilityQuestion } from '@/lib/data/eligibility';
import { submitEligibilityCheck } from '@/lib/actions/eligibility';

/** LRN10b-EligibilitySelfCheck (docs/build/LAYER1_DATA_MODEL_DESIGN.md's Eligibility Self-Check).
 * The board draws exactly one state — "Question 2 of 4," one question per screen, matching
 * REF05-GovukPatterns' "one thing per page" (docs/MOCKUP-INDEX.md) — ported literally: the
 * chromeless top bar with a Back arrow + "Question X of N" counter, the question headline/
 * helper line, the `.opt`/`.radio` option rows, and the `.btn-primary.btn-lg` Continue button.
 * Footer-less on purpose, same as the board (MOCKUP-INDEX's footer-less-flows list names LRN10b
 * explicitly). No result screen is drawn anywhere for this board, so the eligible/not-eligible
 * outcome reuses the shared StateCard (FND10) pattern rather than inventing a bespoke design,
 * same reasoning as LRN09-PublicVerify's not-found state. */
export function EligibilityCheckView({ questions }: { questions: EligibilityQuestion[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ eligible: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (questions.length === 0) {
    return (
      <CenteredShell>
        <StateCard
          icon={<Icon name="alert-circle" className="h-6 w-6" />}
          title="Eligibility check not available yet"
          description="This step hasn't been set up yet — check back soon, or continue to the Course Catalog in the meantime."
        />
      </CenteredShell>
    );
  }

  if (result) {
    return (
      <CenteredShell>
        <StateCard
          icon={<Icon name={result.eligible ? 'check' : 'alert-circle'} className="h-6 w-6" />}
          title={
            result.eligible ? "You're likely eligible" : 'You may not be eligible for WIOA funding'
          }
          description={
            result.eligible
              ? 'Based on your answers, you may qualify for WIOA funding. A WIOA Coordinator will follow up with next steps.'
              : 'Based on your answers, WIOA funding may not be a fit right now — but you can still enroll and pay for a course yourself through the Course Catalog.'
          }
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push(result.eligible ? '/learner/funding' : '/learner/explore')}
            >
              {result.eligible ? 'Continue to Funding' : 'Browse Course Catalog'}
            </button>
          }
        />
      </CenteredShell>
    );
  }

  const question = questions[step];
  const selected = answers[question.id];

  const handleContinue = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const outcome = await submitEligibilityCheck(answers);
        setResult(outcome);
      } catch {
        setError('Something went wrong submitting your answers. Please try again.');
      }
    });
  };

  return (
    <div data-system="learner" style={{ minHeight: '100vh', background: 'var(--surface-muted)' }}>
      <div
        style={{
          height: 64,
          borderBottom: '1px solid var(--nfcap-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          gap: 10,
          background: '#fff',
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => (step > 0 ? setStep(step - 1) : router.back())}
          style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}
        >
          <Icon
            name="arrow-right"
            className="h-4.5 w-4.5 rotate-180"
            style={{ color: 'var(--ink)' }}
          />
        </button>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
          Question {step + 1} of {questions.length}
        </span>
      </div>

      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '64px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'Geist, sans-serif',
            lineHeight: 1.3,
          }}
        >
          {question.prompt}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-muted)' }}>
          This affects which funding category applies — it won&apos;t disqualify you either way.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {question.options.map((option, index) => {
            const isSelected = selected === index;
            return (
              <div
                key={index}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: index }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setAnswers((prev) => ({ ...prev, [question.id]: index }));
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 18px',
                  border: `1.5px solid ${isSelected ? 'var(--nfcap-accent)' : 'var(--nfcap-border)'}`,
                  borderRadius: 'var(--nfcap-radius-md)',
                  fontSize: 15,
                  cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : 'transparent',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--nfcap-accent)' : 'var(--ink-faint)'}`,
                    flexShrink: 0,
                  }}
                />
                {option}
              </div>
            );
          })}
        </div>

        {error && <p style={{ fontSize: 13, color: 'var(--status-problem)' }}>{error}</p>}

        <button
          type="button"
          className="btn-primary btn-lg"
          style={{ width: 'fit-content' }}
          disabled={selected === undefined || isPending}
          onClick={handleContinue}
        >
          {isPending ? 'Submitting…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-system="learner"
      style={{
        minHeight: '100vh',
        background: 'var(--surface-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}
