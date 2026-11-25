'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge, Button, Field, Textarea } from '@/components/ui';
import { Icon } from '@/components/icons';
import { submitGuidedEvidence, getCriterionFileUrl } from '@/lib/actions/progress';
import type { CriterionVerdict } from '@/lib/data/criterionReview';
import type { ResubmissionContext } from '@/lib/data/criterionAttempts';
import { timeAgo } from '@/lib/time-ago';
import type { AssessmentCriterion, Course } from '@/lib/types';

type DraftCapture = { file: File | null; description: string };

/** Feature #9 — LRN06b-EvidenceCapture (desktop) / LRN06c-EvidenceCapturePhone, a guided
 * per-criterion walkthrough that replaces the single free-text + single-file submission form for
 * any course that has assessment criteria (feature #3). Captures are held client-side as a draft
 * and only reach the server on the final "Submit evidence" (`submitGuidedEvidence`) — see that
 * action's own doc comment for why nothing partial reaches the reviewer queue. Courses with zero
 * criteria still use EvidenceView's legacy form. */
export function GuidedEvidenceCapture({
  course,
  criteria: allCriteria,
  criterionVerdicts,
  resubmission,
  mode,
  onSubmitted,
}: {
  course: Course;
  criteria: AssessmentCriterion[];
  criterionVerdicts: CriterionVerdict[];
  /** Feature #10 — set when redoing a rejected submission (LRN06e-EvidenceResubmit). The walkthrough
   * then covers only the criteria that still need evidence; the rest carry forward server-side. */
  resubmission?: ResubmissionContext;
  /** 'summary' shows what's already on the current submission, read-only (pending/approved, or
   * rejected before the learner chooses to resubmit) — EvidenceView decides which, same gate it
   * already applied for the legacy single-file flow. 'capture' is the guided walkthrough. */
  mode: 'summary' | 'capture';
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Targeted resubmission (feature #10): only criteria still needing evidence get a step.
  const needsEvidenceIds = resubmission
    ? new Set(resubmission.notMet.map((c) => c.criterionId))
    : undefined;
  const criteria = needsEvidenceIds
    ? allCriteria.filter((c) => needsEvidenceIds.has(c.id))
    : allCriteria;
  const [drafts, setDrafts] = useState<Record<string, DraftCapture>>({});
  const [activeCriterionId, setActiveCriterionId] = useState<string>(criteria[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verdictByCriterionId = useMemo(
    () => new Map(criterionVerdicts.map((v) => [v.criterionId, v])),
    [criterionVerdicts],
  );

  function captureFor(criterionId: string): DraftCapture {
    return drafts[criterionId] ?? { file: null, description: '' };
  }

  function updateDraft(criterionId: string, patch: Partial<DraftCapture>) {
    setDrafts((prev) => ({ ...prev, [criterionId]: { ...captureFor(criterionId), ...patch } }));
  }

  const isDraftComplete = (criterion: AssessmentCriterion) => {
    const draft = captureFor(criterion.id);
    const hasFile = Boolean(draft.file);
    return criterion.photoRequired ? hasFile : hasFile || draft.description.trim().length > 0;
  };

  const allComplete = criteria.every(isDraftComplete);
  const activeIndex = criteria.findIndex((c) => c.id === activeCriterionId);
  const activeCriterion = criteria[activeIndex];
  const isLastCriterion = activeIndex === criteria.length - 1;

  function goToNext() {
    const next = criteria[activeIndex + 1];
    if (next) setActiveCriterionId(next.id);
  }

  function handleSubmit() {
    setError(null);
    const captures = criteria.map((c) => {
      const draft = captureFor(c.id);
      return { criterionId: c.id, description: draft.description.trim(), file: draft.file };
    });
    setSubmitting(true);
    startTransition(async () => {
      try {
        await submitGuidedEvidence(course.id, captures);
        toast.success(resubmission ? 'Evidence resubmitted' : 'Evidence submitted');
        setDrafts({});
        onSubmitted?.();
        router.refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Something went wrong.';
        setError(message);
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    });
  }

  if (mode === 'summary') {
    return <CriteriaSummary criteria={allCriteria} verdictByCriterionId={verdictByCriterionId} />;
  }

  if (!activeCriterion) return null;

  const draft = captureFor(activeCriterion.id);
  const lastAttempt = resubmission?.notMet.find((c) => c.criterionId === activeCriterion.id);

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator
        criteria={criteria}
        activeCriterionId={activeCriterionId}
        isDraftComplete={isDraftComplete}
        onSelect={setActiveCriterionId}
      />

      <div>
        <div className="text-xs text-[var(--ink-muted)]">
          {course.title}
          <span className="mx-1.5">&rsaquo;</span>
          {activeCriterion.title}
        </div>
        <div className="mt-1 text-xl font-semibold font-[family-name:var(--font-display,inherit)] text-[var(--ink)]">
          {resubmission ? 'Resubmit your evidence' : 'Submit your evidence'}
        </div>
      </div>

      {lastAttempt && (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-[var(--status-problem-border)] bg-[var(--status-problem-bg)] px-5 py-4">
            <Icon
              name="alert-circle"
              className="mt-0.5 size-4 shrink-0 text-[var(--status-problem)]"
            />
            <div className="text-sm leading-relaxed text-[var(--status-problem)]">
              <b>Last attempt:</b>{' '}
              {lastAttempt.reviewerNote ?? 'Your reviewer asked you to resubmit this criterion.'}
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-xl border border-[var(--nfcap-border)] bg-[var(--surface)] px-4 py-3.5 opacity-70">
            {lastAttempt.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Supabase URL
              <img
                src={lastAttempt.thumbUrl}
                alt="Your previous submission"
                className="size-[52px] shrink-0 rounded-md object-cover"
              />
            )}
            <div className="flex-1 text-xs text-[var(--ink-muted)]">
              Previous submission — attempt {lastAttempt.attemptNumber},{' '}
              {timeAgo(lastAttempt.attemptSubmittedAt)}
            </div>
            <Badge tone="danger">● Not Met</Badge>
          </div>
        </>
      )}

      <div className="flex overflow-hidden rounded-xl border border-[var(--nfcap-border)] bg-[var(--surface)] shadow-[var(--nfcap-shadow-sm)]">
        <div className="flex-1 p-5">
          <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
            What to show
          </div>
          <div className="text-sm leading-relaxed text-[var(--ink)]">
            {activeCriterion.guidance}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--status-problem-border)] px-3 py-2 text-sm text-[var(--status-problem)]">
          {error}
        </div>
      )}

      <div
        className={`dropzone ${draft.file ? 'active' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
      >
        {draft.file ? (
          <div className="flex items-center justify-center gap-2">
            <Icon name="paperclip" className="size-4 text-[var(--nfcap-accent)]" />
            <span>{draft.file.name}</span>
            <button
              type="button"
              aria-label="Remove photo"
              onClick={(e) => {
                e.stopPropagation();
                updateDraft(activeCriterion.id, { file: null });
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <Icon name="x" className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <div>
              Drag {resubmission ? 'your new' : 'a'} photo here, or{' '}
              <span className="font-semibold text-[var(--nfcap-accent)]">browse</span>
            </div>
            <div className="mt-1.5 text-xs">JPG or PNG, up to 10MB</div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => updateDraft(activeCriterion.id, { file: e.target.files?.[0] ?? null })}
      />

      <Field
        label={
          <>
            Notes <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
          </>
        }
        htmlFor={`notes-${activeCriterion.id}`}
      >
        <Textarea
          id={`notes-${activeCriterion.id}`}
          value={draft.description}
          onChange={(e) => updateDraft(activeCriterion.id, { description: e.target.value })}
          placeholder="Anything the reviewer should know about this attempt"
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--nfcap-border)] pt-5">
        <Button
          variant="outline"
          size="sm"
          disabled={activeIndex <= 0}
          onClick={() =>
            criteria[activeIndex - 1] && setActiveCriterionId(criteria[activeIndex - 1].id)
          }
        >
          Previous
        </Button>
        <div className="flex items-center gap-2">
          {!isLastCriterion ? (
            <Button variant="outline" size="sm" onClick={goToNext}>
              Save and continue later
            </Button>
          ) : null}
          {!isLastCriterion ? (
            <Button size="sm" disabled={!isDraftComplete(activeCriterion)} onClick={goToNext}>
              Next criterion
              <Icon name="arrow-right" className="size-4" />
            </Button>
          ) : (
            <Button size="sm" disabled={!allComplete || submitting} onClick={handleSubmit}>
              {resubmission ? 'Resubmit evidence' : 'Submit evidence'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  criteria,
  activeCriterionId,
  isDraftComplete,
  onSelect,
}: {
  criteria: AssessmentCriterion[];
  activeCriterionId: string;
  isDraftComplete: (c: AssessmentCriterion) => boolean;
  onSelect: (id: string) => void;
}) {
  if (criteria.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {criteria.map((c, i) => {
        const complete = isDraftComplete(c);
        const active = c.id === activeCriterionId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              active
                ? 'border-[var(--nfcap-accent)] bg-[var(--surface-muted)] text-[var(--ink)]'
                : 'border-[var(--nfcap-border)] text-[var(--ink-muted)]'
            }`}
          >
            {complete ? (
              <Icon name="check" className="size-3 text-[var(--status-complete)]" />
            ) : (
              <span className="size-3 rounded-full border border-current" />
            )}
            {i + 1}. {c.title}
          </button>
        );
      })}
    </div>
  );
}

function CriteriaSummary({
  criteria,
  verdictByCriterionId,
}: {
  criteria: AssessmentCriterion[];
  verdictByCriterionId: Map<string, CriterionVerdict>;
}) {
  const [, startTransition] = useTransition();

  function viewFile(criterionAssessmentId: string | undefined) {
    if (!criterionAssessmentId) return;
    startTransition(async () => {
      try {
        const url = await getCriterionFileUrl(criterionAssessmentId);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not open the photo.');
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--nfcap-border)] bg-[var(--surface)] shadow-[var(--nfcap-shadow-sm)]">
      <div className="border-b border-[var(--nfcap-border)] px-5 py-4 text-sm font-semibold text-[var(--ink)]">
        Criteria for this submission
      </div>
      <div className="px-5">
        {criteria.map((criterion) => {
          const verdict = verdictByCriterionId.get(criterion.id);
          return (
            <div className="crit" key={criterion.id}>
              {verdict?.met === true ? (
                <span className="chk done flex items-center justify-center">
                  <Icon name="check" className="size-3 text-white" />
                </span>
              ) : verdict?.met === false ? (
                <span className="chk flex items-center justify-center border-[var(--status-problem)] bg-[var(--status-problem-bg)]">
                  <Icon name="x" className="size-3 text-[var(--status-problem)]" />
                </span>
              ) : (
                <span className="chk" />
              )}
              <div className="flex-1">
                <b>{criterion.title}</b>
                <div className="mt-0.5 text-[var(--ink-muted)]">{criterion.guidance}</div>
                {verdict?.hasLearnerFile && (
                  <button
                    type="button"
                    onClick={() => viewFile(verdict.criterionAssessmentId)}
                    className="mt-1.5 flex items-center gap-1.5 text-[var(--nfcap-accent)] hover:underline"
                  >
                    <Icon name="paperclip" className="size-3.5" />
                    {verdict.learnerFileName ?? 'View submitted photo'}
                  </button>
                )}
                {verdict?.met === false && verdict.reviewerNote && (
                  <div className="mt-1.5 text-[var(--status-problem)]">
                    Reviewer note: {verdict.reviewerNote}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
