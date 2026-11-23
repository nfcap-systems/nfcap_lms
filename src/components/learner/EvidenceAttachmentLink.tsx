'use client';

import { useTransition } from 'react';
import { Icon } from '@/components/icons';
import { getEvidenceFileUrl } from '@/lib/actions/progress';

/** Small client leaf so pages that list evidence (e.g. Portfolio) can stay server components —
 * the signed URL is fetched on click, not embedded in page data (it expires in 5 minutes). */
export function EvidenceAttachmentLink({
  evidenceSubmissionId,
  fileName,
}: {
  evidenceSubmissionId: string;
  fileName?: string;
}) {
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          const url = await getEvidenceFileUrl(evidenceSubmissionId);
          window.open(url, '_blank', 'noopener,noreferrer');
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
