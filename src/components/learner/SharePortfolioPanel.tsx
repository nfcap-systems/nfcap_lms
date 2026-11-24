'use client';

import { useState, useTransition } from 'react';
import { Icon } from '@/components/icons';
import { generatePortfolioShareToken } from '@/lib/actions/portfolio';

/** LRN07-Portfolio's "Share your portfolio" sidebar panel. The public `/portfolio/[token]`-style
 * route this implies doesn't exist yet (Layer 4 — docs/build/LAYER1_DATA_MODEL_DESIGN.md), so the
 * copied link won't resolve to anything real today. Still wires the real token-generation action
 * rather than a fake button, and says so plainly instead of hiding the gap. */
export function SharePortfolioPanel() {
  const [, startTransition] = useTransition();
  const [state, setState] = useState<'idle' | 'copied'>('idle');

  function copyLink() {
    startTransition(async () => {
      const token = await generatePortfolioShareToken();
      await navigator.clipboard.writeText(`${window.location.origin}/portfolio/${token}`);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
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
        {state === 'copied' ? 'Copied!' : 'Copy share link'}
      </button>
      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
        The read-only viewing page itself isn&apos;t built yet — this link won&apos;t resolve until
        it is.
      </div>
    </div>
  );
}
