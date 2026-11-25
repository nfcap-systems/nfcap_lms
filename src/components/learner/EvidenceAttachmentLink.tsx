'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/icons';
import { getCriterionFileUrl, getEvidenceFileUrl } from '@/lib/actions/progress';

/** Small client leaf so pages that list evidence (e.g. Portfolio) can stay server components —
 * the signed URL is fetched on click, not embedded in page data (it expires in 5 minutes). */
export function EvidenceAttachmentLink({
  evidenceSubmissionId,
  criterionAssessmentId,
  fileName,
}: {
  /** The legacy course-level attachment (`EvidenceSubmission.filePath`). */
  evidenceSubmissionId?: string;
  /** A single criterion's own capture (feature #9) — guided submissions store their files here,
   * not on the submission, so the course-level action can't serve them. */
  criterionAssessmentId?: string;
  fileName?: string;
}) {
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          try {
            const url = criterionAssessmentId
              ? await getCriterionFileUrl(criterionAssessmentId)
              : await getEvidenceFileUrl(evidenceSubmissionId!);
            window.open(url, '_blank', 'noopener,noreferrer');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not open the attachment.');
          }
        });
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--ink-muted)',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <Icon name="paperclip" className="h-3.5 w-3.5" />
      {fileName ?? 'View attachment'}
    </button>
  );
}
