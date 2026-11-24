'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { getPublicPortfolioFileUrl } from '@/lib/actions/portfolio';

/** Same fetch-on-mount pattern as `EvidenceThumbnail`, for the public `/portfolio/[token]` page —
 * there's no session there, so it resolves through the token-scoped `getPublicPortfolioFileUrl`
 * instead of the owner/Admin-gated `getEvidenceFileUrl`/`getCriterionFileUrl`. */
export function PublicEvidenceThumbnail({
  token,
  evidenceSubmissionId,
  criterionAssessmentId,
}: {
  token: string;
  evidenceSubmissionId?: string;
  criterionAssessmentId?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicPortfolioFileUrl(token, { evidenceSubmissionId, criterionAssessmentId }).then(
      (resolved) => {
        if (!cancelled) setUrl(resolved);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, evidenceSubmissionId, criterionAssessmentId]);

  if (!url) {
    return (
      <div
        className="thumb"
        style={{
          background: 'var(--surface-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-faint)',
        }}
      >
        <Icon name="image" className="h-6 w-6" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived Storage URL, not a local/optimizable asset
    <img src={url} alt="" className="thumb" />
  );
}
