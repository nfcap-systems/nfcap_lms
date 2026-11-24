'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { getCriterionFileUrl, getEvidenceFileUrl } from '@/lib/actions/progress';

/** A real evidence photo thumbnail for the Portfolio grid (LRN07-Portfolio) — fetched client-side
 * on mount rather than embedded in page data, same reasoning as EvidenceAttachmentLink's
 * click-to-fetch (the signed URL expires in 5 minutes; this still only runs when a viewer's
 * browser actually renders the page, never baked into a cached server response). */
export function EvidenceThumbnail({
  evidenceSubmissionId,
  criterionAssessmentId,
}: {
  evidenceSubmissionId?: string;
  criterionAssessmentId?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (criterionAssessmentId
      ? getCriterionFileUrl(criterionAssessmentId)
      : getEvidenceFileUrl(evidenceSubmissionId!)
    ).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [evidenceSubmissionId, criterionAssessmentId]);

  if (!url) {
    return (
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--nfcap-radius-sm)',
          background: 'var(--surface-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-faint)',
          flexShrink: 0,
        }}
      >
        <Icon name="image" className="h-4 w-4" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived Storage URL, not a local/optimizable asset
    <img
      src={url}
      alt=""
      style={{
        width: 44,
        height: 44,
        borderRadius: 'var(--nfcap-radius-sm)',
        objectFit: 'cover',
        flexShrink: 0,
      }}
    />
  );
}
