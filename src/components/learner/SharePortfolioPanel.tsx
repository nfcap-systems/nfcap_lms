'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/icons';
import { generatePortfolioShareToken, revokePortfolioShareToken } from '@/lib/actions/portfolio';

/** LRN07-Portfolio's "Share your portfolio" sidebar panel, wired to the real
 * `/portfolio/[token]` public page (Phase 4) — the copied link now resolves to a real, read-only
 * view. `initialToken` is the learner's own current share state, fetched server-side by
 * `PortfolioPage`, so a returning learner sees "Stop sharing" immediately instead of always
 * starting from "Copy share link". */
export function SharePortfolioPanel({ initialToken }: { initialToken: string | null }) {
  const [, startTransition] = useTransition();
  const [token, setToken] = useState(initialToken);
  const [state, setState] = useState<'idle' | 'copied'>('idle');

  function copyLink() {
    startTransition(async () => {
      try {
        const nextToken = token ?? (await generatePortfolioShareToken());
        setToken(nextToken);
        await navigator.clipboard.writeText(`${window.location.origin}/portfolio/${nextToken}`);
        setState('copied');
        toast.success('Share link copied to clipboard');
        setTimeout(() => setState('idle'), 2000);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not create the share link.');
      }
    });
  }

  function stopSharing() {
    startTransition(async () => {
      try {
        await revokePortfolioShareToken();
        setToken(null);
        toast.success('Portfolio sharing turned off');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not turn off sharing.');
      }
    });
  }

  return (
    <div
      className="lrn-side-panel"
      style={{ background: 'linear-gradient(135deg, #eff6ff, #f8fafc)', borderColor: '#bfdbfe' }}
    >
      <div className="lrn-side-title">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon
            name="arrow-right"
            className="h-3.5 w-3.5"
            style={{ color: 'var(--nfcap-accent)' }}
          />
          Share your portfolio
        </h3>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
        Give an employer or recruiter a read-only link showing your evidence, met criteria and
        earned certificates.
      </div>
      <button
        type="button"
        className="btn-secondary btn-sm"
        style={{ width: '100%' }}
        onClick={copyLink}
      >
        {state === 'copied' ? 'Copied!' : token ? 'Copy share link' : 'Create share link'}
      </button>
      {token && (
        <>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            Sharing is on — anyone with the link can view your portfolio, no sign-in required.
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ width: '100%' }}
            onClick={stopSharing}
          >
            Stop sharing
          </button>
        </>
      )}
    </div>
  );
}
