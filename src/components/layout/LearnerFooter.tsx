import Link from 'next/link';

/** Ported from the canvas's LearnerFooter.dc.html (gate NFCAP-6) — a shared footer reused across
 * Learner-facing pages, including public no-login ones like /verify/[slug] (LRN09-PublicVerify).
 * The board's own "Help & Support" link has no target (its own markup uses a bare `href="#"`);
 * Privacy/Terms wire to the real routes that already exist. `nested` matches the board's own
 * prop for use inside an already-padded container vs. as a page's own full-width footer. */
export function LearnerFooter({
  maxWidth = 1296,
  nested = false,
}: {
  maxWidth?: number;
  nested?: boolean;
}) {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--nfcap-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        color: 'var(--ink-muted)',
        fontSize: 11.5,
        boxSizing: 'border-box',
        ...(nested
          ? { margin: '28px 2px 0', padding: '18px 2px 0', width: '100%' }
          : { maxWidth, margin: '16px auto 0', padding: '18px 24px 24px' }),
      }}
    >
      <span>© 2026 NFCAP. Residential Flooring Apprenticeship Program.</span>
      <nav style={{ display: 'flex', gap: 22 }}>
        <span style={{ color: 'var(--ink-muted)', textDecoration: 'underline' }}>
          Help &amp; Support
        </span>
        <Link href="/privacy" style={{ color: 'var(--ink-muted)', textDecoration: 'underline' }}>
          Privacy
        </Link>
        <Link href="/terms" style={{ color: 'var(--ink-muted)', textDecoration: 'underline' }}>
          Terms
        </Link>
      </nav>
    </footer>
  );
}
