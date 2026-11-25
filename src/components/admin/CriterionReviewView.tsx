'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Icon } from '@/components/icons';
import { getEvidenceFileUrl, getCriterionFileUrl } from '@/lib/actions/progress';
import { setCriterionVerdict, finalizeCriterionReview } from '@/lib/actions/criterionReview';
import type { CriterionReviewData } from '@/lib/data/criterionReview';
import type { LearnerRecord } from '@/lib/data/learners';
import type { AdminCourse } from '@/lib/data/courses';
import { PhotoAnnotationDialog } from './PhotoAnnotationDialog';

/** ADM11-PerCriterionReview — feature #7's real per-criterion evidence review and gated
 * certification screen. Replaces LearnerProfileView's inline Approve/Reject for any course that
 * has assessment criteria (src/components/admin/LearnerProfileView.tsx routes here instead). */
export function CriterionReviewView({
  learner,
  course,
  review,
}: {
  learner: LearnerRecord;
  course: AdminCourse;
  review: CriterionReviewData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [overallNote, setOverallNote] = useState(review.overallNote ?? '');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(
    Object.fromEntries(review.criteria.map((c) => [c.criterionId, c.reviewerNote ?? ''])),
  );
  const [error, setError] = useState<string | null>(null);
  const [annotatingCriterionId, setAnnotatingCriterionId] = useState<string | null>(null);

  const mandatoryUnmetCount = review.criteria.filter(
    (c) => c.mandatoryForCertification && c.met !== true,
  ).length;

  function setVerdict(criterionId: string, met: boolean) {
    setError(null);
    const note = met ? undefined : noteDrafts[criterionId] || undefined;
    startTransition(async () => {
      try {
        await setCriterionVerdict(review.evidenceSubmissionId, criterionId, met, note);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not save that verdict.');
      }
    });
  }

  function saveNote(criterionId: string, met: boolean | null) {
    if (met !== false) return; // note is only persisted alongside a "Not met" verdict
    startTransition(async () => {
      try {
        await setCriterionVerdict(
          review.evidenceSubmissionId,
          criterionId,
          false,
          noteDrafts[criterionId] || undefined,
        );
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not save that note.');
      }
    });
  }

  function finalize(decision: 'complete' | 'resubmit') {
    setError(null);
    startTransition(async () => {
      try {
        await finalizeCriterionReview(learner.id, course.id, decision, overallNote || undefined);
        toast.success(decision === 'complete' ? 'Marked complete' : 'Resubmission requested');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  function viewAttachment() {
    startTransition(async () => {
      const url = await getEvidenceFileUrl(review.evidenceSubmissionId);
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  function viewCriterionFile(criterionAssessmentId: string | undefined) {
    if (!criterionAssessmentId) return;
    startTransition(async () => {
      const url = await getCriterionFileUrl(criterionAssessmentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  const annotatingCriterion = review.criteria.find((c) => c.criterionId === annotatingCriterionId);

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>
            {learner.name} — {course.title}
          </h1>
          <p>Review Queue / per-criterion evidence review</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={isPending}
            onClick={() => finalize('resubmit')}
          >
            Request resubmission
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={isPending}
            title={
              mandatoryUnmetCount > 0
                ? `${mandatoryUnmetCount} mandatory criterion/criteria not yet marked Met`
                : undefined
            }
            onClick={() => finalize('complete')}
          >
            Mark complete
          </button>
        </div>
      </div>

      {error && (
        <div
          className="callout"
          style={{ borderColor: 'var(--status-problem-border)', color: 'var(--status-problem)' }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <div className="panel" style={{ flex: 1.3 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 10 }}>
            Submitted evidence
          </div>
          <EvidencePreview review={review} />
          {review.hasFile && (
            <button
              type="button"
              onClick={viewAttachment}
              className="flex items-center gap-2 rounded-lg border border-[var(--nfcap-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
              style={{ marginTop: 10, marginBottom: 14 }}
            >
              <Icon name="paperclip" className="size-4 shrink-0 text-[var(--nfcap-accent)]" />
              {review.fileName ?? 'View attachment'}
            </button>
          )}
          {/* Guided submissions (feature #9) carry no course-level description — this used to
              render as a bare pair of quote marks (feature #12). */}
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
            {review.description.trim().length > 0 ? (
              <>&ldquo;{review.description}&rdquo;</>
            ) : (
              <span style={{ color: 'var(--ink-faint)' }}>
                No overall description — this evidence was submitted criterion by criterion.
              </span>
            )}
          </div>
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 10 }}>
            Criteria checklist
          </div>
          {review.criteria.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
              This course has no assessment criteria defined.
            </p>
          ) : (
            review.criteria.map((criterion) => (
              <div className="critrow" key={criterion.criterionId}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {criterion.title}
                    {!criterion.mandatoryForCertification && (
                      <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>
                        {' '}
                        (optional)
                      </span>
                    )}
                  </div>
                  {criterion.hasLearnerFile && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => viewCriterionFile(criterion.criterionAssessmentId)}
                        className="flex items-center gap-1.5 text-xs text-[var(--nfcap-accent)] hover:underline"
                      >
                        <Icon name="paperclip" className="size-3.5" />
                        {criterion.learnerFileName ?? 'View photo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnnotatingCriterionId(criterion.criterionId)}
                        className="flex items-center gap-1.5 text-xs text-[var(--nfcap-accent)] hover:underline"
                      >
                        <Icon name="edit" className="size-3.5" />
                        {criterion.annotationData && criterion.annotationData.length > 0
                          ? 'Edit annotation'
                          : 'Annotate'}
                      </button>
                    </div>
                  )}
                  {criterion.learnerDescription && (
                    <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-muted)' }}>
                      &ldquo;{criterion.learnerDescription}&rdquo;
                    </div>
                  )}
                  {criterion.met === false && (
                    <textarea
                      className="field-textarea"
                      style={{ marginTop: 6, minHeight: 50, fontSize: 12.5 }}
                      placeholder="Reviewer note — what needs to change for resubmission"
                      value={noteDrafts[criterion.criterionId] ?? ''}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [criterion.criterionId]: e.target.value,
                        }))
                      }
                      onBlur={() => saveNote(criterion.criterionId, criterion.met)}
                    />
                  )}
                </div>
                <div className="seg3">
                  <button
                    type="button"
                    className={criterion.met === true ? 'on met' : undefined}
                    disabled={isPending}
                    onClick={() => setVerdict(criterion.criterionId, true)}
                  >
                    Met
                  </button>
                  <button
                    type="button"
                    className={criterion.met === false ? 'on not-met' : undefined}
                    disabled={isPending}
                    onClick={() => setVerdict(criterion.criterionId, false)}
                  >
                    Not met
                  </button>
                </div>
              </div>
            ))
          )}

          <div style={{ marginTop: 12 }}>
            <label className="field-label">Overall note to learner</label>
            <textarea
              className="field-textarea"
              value={overallNote}
              onChange={(e) => setOverallNote(e.target.value)}
            />
          </div>
        </div>
      </div>

      {annotatingCriterion?.criterionAssessmentId && (
        <PhotoAnnotationDialog
          key={annotatingCriterion.criterionAssessmentId}
          open={Boolean(annotatingCriterionId)}
          onClose={() => {
            setAnnotatingCriterionId(null);
            router.refresh();
          }}
          criterionAssessmentId={annotatingCriterion.criterionAssessmentId}
          criterionTitle={annotatingCriterion.title}
          initialMarks={annotatingCriterion.annotationData ?? []}
          initialNote={annotatingCriterion.reviewerNote ?? ''}
        />
      )}
    </div>
  );
}

type EvidencePhoto = {
  key: string;
  label: string;
  criterionAssessmentId?: string;
  isSubmissionFile?: boolean;
};

/** ADM11's inline evidence preview — a large frame plus a thumbnail strip, replacing the
 * click-through-only "View attachment" button. Covers both evidence shapes: the legacy
 * course-level file, and every per-criterion photo on a guided submission. */
function EvidencePreview({ review }: { review: CriterionReviewData }) {
  const photos: EvidencePhoto[] = [];
  if (review.hasFile) {
    photos.push({
      key: 'submission',
      label: review.fileName ?? 'Overall photo',
      isSubmissionFile: true,
    });
  }
  for (const criterion of review.criteria) {
    if (criterion.hasLearnerFile && criterion.criterionAssessmentId) {
      photos.push({
        key: criterion.criterionAssessmentId,
        label: criterion.title,
        criterionAssessmentId: criterion.criterionAssessmentId,
      });
    }
  }

  const [selected, setSelected] = useState(0);
  const [url, setUrl] = useState<string | null>(null);

  const active = photos[selected];

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (active.isSubmissionFile
      ? getEvidenceFileUrl(review.evidenceSubmissionId)
      : getCriterionFileUrl(active.criterionAssessmentId!)
    ).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `active` is derived from `photos`, which is rebuilt every render; keying off its identity fields instead avoids re-fetching on every render
  }, [active?.key, review.evidenceSubmissionId]);

  return (
    <div>
      <div
        style={{
          border: '1px solid var(--nfcap-border)',
          borderRadius: 'var(--nfcap-radius-md)',
          height: 360,
          background: 'var(--surface-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-faint)',
          fontSize: 13,
          marginBottom: 10,
          overflow: 'hidden',
        }}
      >
        {!active ? (
          <Icon name="image" className="h-12 w-12" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived Storage URL, not a local/optimizable asset
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <Icon name="image" className="h-12 w-12" />
        )}
      </div>
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {photos.map((photo, index) => (
            <button
              key={photo.key}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={photo.label}
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--nfcap-radius-md)',
                border:
                  index === selected
                    ? '2px solid var(--nfcap-accent)'
                    : '1px solid var(--nfcap-border)',
                background: 'var(--surface-muted)',
                padding: 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
