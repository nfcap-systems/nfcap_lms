'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import { timeAgo } from '@/lib/time-ago';
import type { ResubmissionContext } from '@/lib/data/criterionAttempts';
import type { CriterionVerdict } from '@/lib/data/criterionReview';
import type { Course } from '@/lib/types';

/** Feature #10 — LRN06d-EvidenceNotMet. Shown to a learner whose latest submission was sent back:
 * which criteria weren't met, the reviewer's note on each, and the single action to fix it. Only
 * criteria that still need work get a feedback card; criteria already Met are just listed as
 * checked, because they carry forward untouched on resubmission. */
export function EvidenceNotMet({
  course,
  criterionVerdicts,
  context,
  onResubmit,
}: {
  course: Course;
  criterionVerdicts: CriterionVerdict[];
  context: ResubmissionContext;
  onResubmit: () => void;
}) {
  const reviewedLine = [
    course.title,
    context.reviewedAt
      ? `Reviewed ${timeAgo(context.reviewedAt)}${context.reviewerName ? ` by ${context.reviewerName}` : ''}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4 rounded-xl border border-[var(--status-problem-border)] bg-[var(--surface)] p-6 shadow-[var(--nfcap-shadow-sm)]">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--status-problem-bg)] text-[var(--status-problem)]">
          <Icon name="x" className="size-5" />
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--ink)]">Evidence not met</div>
          <div className="mt-1 text-sm text-[var(--ink-muted)]">{reviewedLine}</div>
        </div>
      </div>

      {context.notMet.map((criterion) => (
        <div
          key={criterion.criterionId}
          className="flex flex-col gap-4 rounded-xl border border-[var(--nfcap-border)] bg-[var(--surface)] p-5 shadow-[var(--nfcap-shadow-sm)] sm:flex-row"
        >
          {criterion.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Supabase URL
            <img
              src={criterion.thumbUrl}
              alt={`Your submitted evidence for ${criterion.title}`}
              className="size-20 shrink-0 rounded-lg object-cover sm:size-[110px]"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
              {criterion.title}
            </div>
            <div className="mt-1 mb-1.5 text-sm font-semibold text-[var(--ink)]">
              Reviewer&apos;s note
            </div>
            <p className="text-sm leading-relaxed text-[var(--ink)]">
              {criterion.reviewerNote ?? 'Your reviewer didn’t leave a note on this criterion.'}
            </p>
            {criterion.hasHistory && (
              <Link
                href={`/learner/courses/${course.id}/attempts/${criterion.criterionId}`}
                className="mt-2 inline-block text-sm font-medium text-[var(--nfcap-accent)] hover:underline"
              >
                View attempt history
              </Link>
            )}
          </div>
        </div>
      ))}

      {context.overallNote && (
        <div className="rounded-xl border border-[var(--nfcap-border)] bg-[var(--surface)] p-5 shadow-[var(--nfcap-shadow-sm)]">
          <div className="mb-1.5 text-sm font-semibold text-[var(--ink)]">
            Note from your reviewer
          </div>
          <p className="text-sm leading-relaxed text-[var(--ink)]">{context.overallNote}</p>
        </div>
      )}

      <div className="rounded-xl border border-[var(--nfcap-border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--nfcap-shadow-sm)]">
        <div className="mb-2.5 text-sm font-semibold text-[var(--ink)]">Criteria checked</div>
        <div className="flex flex-col gap-2 text-sm text-[var(--ink)]">
          {criterionVerdicts.map((v) => (
            <div key={v.criterionId} className="flex items-center gap-2">
              {v.met === true ? (
                <Icon name="check" className="size-4 text-[var(--status-complete)]" />
              ) : v.met === false ? (
                <Icon name="x" className="size-4 text-[var(--status-problem)]" />
              ) : (
                <span className="size-4 rounded-full border border-[var(--nfcap-border)]" />
              )}
              {v.title}
            </div>
          ))}
        </div>
        {context.metCriterionIds.length > 0 && (
          <p className="mt-3 text-xs text-[var(--ink-muted)]">
            Criteria already met stay as they are — you only need to redo the others.
          </p>
        )}
      </div>

      <Button size="lg" className="w-fit" onClick={onResubmit}>
        Resubmit evidence
      </Button>
    </div>
  );
}
