'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Field, Textarea } from '@/components/ui';
import { Icon } from '@/components/icons';
import { submitEvidence, getEvidenceFileUrl } from '@/lib/actions/progress';
import type { EvidenceSubmission } from '@/lib/data/progress';
import type { CriterionVerdict } from '@/lib/data/criterionReview';
import type { AssessmentCriterion, Course } from '@/lib/types';
import type { ResubmissionContext } from '@/lib/data/criterionAttempts';
import { GuidedEvidenceCapture } from './GuidedEvidenceCapture';
import { EvidenceNotMet } from './EvidenceNotMet';

const statusCopy: Record<
  'pending' | 'approved' | 'rejected',
  { tone: 'pending' | 'success' | 'danger'; label: string }
> = {
  pending: { tone: 'pending', label: 'Pending Verification' },
  approved: { tone: 'success', label: 'Verified' },
  rejected: { tone: 'danger', label: 'Needs Resubmission' },
};

export function EvidenceView({
  course,
  evidence,
  criteria = [],
  criterionVerdicts,
  resubmission,
}: {
  course: Course;
  evidence: EvidenceSubmission | undefined;
  /** This course's assessment criteria (feature #3), for the "what this evidence needs to show"
   * checklist (LRN06-EvidenceCriteria) shown above the submission form. */
  criteria?: AssessmentCriterion[];
  /** Per-criterion verdicts on the current `evidence` submission, once Admin has reviewed any of
   * them (feature #7, src/lib/data/criterionReview.ts) — undefined before a verdict exists. */
  criterionVerdicts?: CriterionVerdict[];
  /** Feedback + carry-forward info when the latest submission was sent back (feature #10,
   * src/lib/data/criterionAttempts.ts) — undefined otherwise. */
  resubmission?: ResubmissionContext;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resubmitting, setResubmitting] = useState(false);

  // Whether a NEW submission goes through the guided per-criterion flow — a property of the
  // course, since that is what decides the form the learner is given.
  const guided = criteria.length > 0;
  // Whether the EXISTING submission was made that way. Not the same question: a submission made
  // before feature #9 (or before this course had criteria) keeps its evidence in
  // `description`/`fileName`, and rendering it through the guided summary hides it entirely —
  // the legacy-data regression this split fixes
  // (docs/plans/phase-3-and-design-migration-kickoff.md Step 2, feature #12).
  const submissionIsGuided = Boolean(evidence?.isPerCriterion);

  if (
    evidence &&
    !resubmitting &&
    submissionIsGuided &&
    evidence.status === 'rejected' &&
    resubmission
  ) {
    return (
      <EvidenceNotMet
        course={course}
        criterionVerdicts={criterionVerdicts ?? []}
        context={resubmission}
        onResubmit={() => setResubmitting(true)}
      />
    );
  }

  if (evidence && !resubmitting) {
    const status = statusCopy[evidence.status];
    return (
      <div className="flex flex-col gap-5">
        <Header />
        {submissionIsGuided ? (
          <GuidedEvidenceCapture
            course={course}
            criteria={criteria}
            criterionVerdicts={criterionVerdicts ?? []}
            mode="summary"
          />
        ) : (
          <CriteriaChecklist criteria={criteria} verdicts={criterionVerdicts} />
        )}
        <div className="flex flex-col items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <Badge tone={status.tone}>{status.label}</Badge>
          <p className="text-sm text-[var(--ink-muted)]">
            Submitted{' '}
            {new Date(evidence.submittedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {evidence.status === 'pending'
              ? '. NFCAP staff will review your submission and update its status here.'
              : evidence.status === 'approved'
                ? '. Your course is complete and your certificate has been issued.'
                : '. Update your submission below and resubmit for another review.'}
          </p>
          {!submissionIsGuided && (
            <p className="text-sm text-[var(--ink)]">{evidence.description}</p>
          )}
          {!submissionIsGuided && evidence.hasSubmissionFile && (
            <button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  const url = await getEvidenceFileUrl(evidence.id);
                  window.open(url, '_blank', 'noopener,noreferrer');
                });
              }}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <Icon name="paperclip" className="size-4 shrink-0 text-[var(--accent)]" />
              {evidence.fileName ?? 'View attachment'}
            </button>
          )}
          {evidence.status === 'approved' && (
            <Button size="sm" onClick={() => router.push('/learner/certificates')}>
              <Icon name="award" className="size-4" />
              View Certificate
            </Button>
          )}
          {evidence.status === 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDescription(evidence.description);
                setResubmitting(true);
              }}
            >
              Resubmit Evidence
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (guided) {
    return (
      <div className="flex flex-col gap-5">
        <Header />
        <GuidedEvidenceCapture
          course={course}
          criteria={criteria}
          criterionVerdicts={criterionVerdicts ?? []}
          resubmission={evidence?.status === 'rejected' ? resubmission : undefined}
          mode="capture"
          onSubmitted={() => setResubmitting(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Header />
      <CriteriaChecklist criteria={criteria} verdicts={criterionVerdicts} />
      <p className="text-sm text-[var(--ink-muted)]">{course.evidencePrompt}</p>

      <Field
        label="Description"
        htmlFor="evidence-description"
        hint="Describe the work shown and how it demonstrates what you learned."
      >
        <Textarea
          id="evidence-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your practical evidence..."
        />
      </Field>

      <Field label="Attachment (optional)">
        {file ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-muted)]">
            <span className="flex items-center gap-2 truncate">
              <Icon name="paperclip" className="size-4 shrink-0 text-[var(--accent)]" />
              <span className="truncate">{file.name}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              aria-label="Remove attachment"
              className="shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <Icon name="x" className="size-4" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" className="size-4" />
            Attach photo or file
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>

      <div className="border-t border-[var(--border)] pt-5">
        <Button
          disabled={description.trim().length === 0}
          onClick={() => {
            const desc = description.trim();
            const attachment = file;
            startTransition(async () => {
              await submitEvidence(course.id, desc, attachment);
              router.refresh();
            });
            setResubmitting(false);
          }}
        >
          {evidence ? 'Resubmit Evidence' : 'Submit Evidence'}
        </Button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
      <Badge tone="info">
        <Icon name="paperclip" className="size-3" />
        Practical Evidence
      </Badge>
    </div>
  );
}

/** "What this evidence needs to show" (LRN06-EvidenceCriteria) — the criteria list always shows;
 * once Admin has reviewed any of them (feature #7), each row also shows its verdict instead of a
 * plain unchecked box. */
function CriteriaChecklist({
  criteria,
  verdicts,
}: {
  criteria: AssessmentCriterion[];
  verdicts?: CriterionVerdict[];
}) {
  if (criteria.length === 0) return null;
  const verdictByCriterionId = new Map((verdicts ?? []).map((v) => [v.criterionId, v]));

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--border)] px-5 py-4 text-sm font-semibold text-[var(--ink)]">
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
              <div>
                <b>{criterion.title}</b>
                <div className="mt-0.5 text-[var(--ink-muted)]">{criterion.guidance}</div>
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
