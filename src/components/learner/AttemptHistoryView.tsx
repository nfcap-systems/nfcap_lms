import { Badge, StateCard } from '@/components/ui';
import { dayLabel } from '@/lib/time-ago';
import type {
  AttemptOutcome,
  CriterionAttempt,
  CriterionAttemptHistory,
} from '@/lib/data/criterionAttempts';

const outcomeBadge: Record<
  AttemptOutcome,
  { tone: 'success' | 'danger' | 'pending' | 'neutral'; label: string }
> = {
  met: { tone: 'success', label: '✓ Met' },
  not_met: { tone: 'danger', label: '● Not Met' },
  pending: { tone: 'pending', label: 'Pending review' },
  unreviewed: { tone: 'neutral', label: 'Not reviewed' },
};

function detailLine(attempt: CriterionAttempt): string {
  const parts = [`Submitted ${dayLabel(attempt.submittedAt)}`];
  if (attempt.reviewerName && attempt.outcome !== 'pending') {
    parts.push(`Reviewed by ${attempt.reviewerName}`);
  }
  if (attempt.outcome === 'not_met' && attempt.reviewerNote) {
    parts.push(`“${attempt.reviewerNote}”`);
  }
  return parts.join(' · ');
}

/** Feature #11 — LRN06f-AttemptHistory. Newest attempt first; earlier attempts' photos are dimmed
 * exactly as the board draws them. */
export function AttemptHistoryView({
  courseTitle,
  history,
}: {
  courseTitle: string;
  history: CriterionAttemptHistory;
}) {
  return (
    <>
      <div>
        <div className="text-xs text-[var(--ink-muted)]">
          {courseTitle}
          <span className="mx-1.5">&rsaquo;</span>
          {history.criterionTitle}
        </div>
        <h1 className="mt-1 text-2xl font-bold font-[family-name:var(--font-display,inherit)] text-[var(--ink)]">
          Attempt history
        </h1>
      </div>

      {history.attempts.length === 0 ? (
        <StateCard
          title="No attempts yet"
          description="Once you submit evidence for this criterion, every attempt will be listed here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          {history.attempts.map((attempt, i) => {
            const badge = outcomeBadge[attempt.outcome];
            return (
              <div className="att" key={attempt.attemptNumber}>
                {attempt.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Supabase URL
                  <img
                    src={attempt.thumbUrl}
                    alt={`Photo for attempt ${attempt.attemptNumber}`}
                    className={`size-16 shrink-0 rounded-lg object-cover ${i > 0 ? 'opacity-60' : ''}`}
                  />
                ) : null}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <b className="text-sm text-[var(--ink)]">Attempt {attempt.attemptNumber}</b>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-[var(--ink-muted)]">{detailLine(attempt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
