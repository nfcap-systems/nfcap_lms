'use client';

import { useState, useTransition } from 'react';
import { Drawer } from '@/components/ui';
import { Icon } from '@/components/icons';
import { generateCertificatePublicSlug, getCertificatePdfBase64 } from '@/lib/actions/credentials';
import { downloadBase64File } from '@/lib/download';
import type { Credential } from '@/lib/data/credentials';
import { CertificateDocument } from './CertificateDocument';

/** LRN08-Certificates' earned card — matches the board's `.ccard` pattern (same one
 * CertificatesView uses inline for the locked/in-progress cards in this same grid), not a
 * separate shadcn design. "Download PDF" is the board's placeholder, now wired for real
 * (Phase 4); "Copy verify link" sits alongside it rather than replacing it. */
export function CertificateCard({
  credential,
  learnerName,
}: {
  credential: Credential;
  learnerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [downloading, startDownload] = useTransition();
  const [, startTransition] = useTransition();
  const { course } = credential;

  function copyVerificationLink() {
    startTransition(async () => {
      const slug = await generateCertificatePublicSlug(credential.rawId);
      await navigator.clipboard.writeText(`${window.location.origin}/verify/${slug}`);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    });
  }

  function downloadPdf() {
    startDownload(async () => {
      const { base64, filename } = await getCertificatePdfBase64(credential.rawId);
      downloadBase64File(base64, filename, 'application/pdf');
    });
  }
  const issuedDate = new Date(credential.issuedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--nfcap-border)',
          borderRadius: 'var(--nfcap-radius-lg)',
          boxShadow: 'var(--nfcap-shadow-sm)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--nfcap-radius-md)',
              background: 'var(--status-complete-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-complete)',
              flexShrink: 0,
            }}
          >
            <Icon name="award" className="h-6 w-6" />
          </div>
          <div>
            <b style={{ fontSize: 15, color: 'var(--ink)' }}>{course.title}</b>
            <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2 }}>
              Earned {issuedDate} · ID {credential.certificateId}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ flex: 1 }}
            onClick={() => setOpen(true)}
          >
            View
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onClick={copyVerificationLink}
          >
            <Icon name={copyState === 'copied' ? 'check' : 'shield'} className="h-3.5 w-3.5" />
            {copyState === 'copied' ? 'Copied!' : 'Copy verify link'}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onClick={downloadPdf}
            disabled={downloading}
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Certificate"
        panelClassName="max-w-xl"
      >
        <CertificateDocument credential={credential} learnerName={learnerName} />
      </Drawer>
    </>
  );
}
