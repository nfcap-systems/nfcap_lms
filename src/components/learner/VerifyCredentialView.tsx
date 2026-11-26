import { Icon } from '@/components/icons';
import { StateCard } from '@/components/ui';
import { LearnerFooter } from '@/components/layout/LearnerFooter';
import type { PublicCredential } from '@/lib/data/credentials';

/** LRN09-PublicVerify (docs/build/LAYER1_DATA_MODEL_DESIGN.md's Public Verification Page + QR).
 * Public, no sign-in — matches the board's own minimal top bar (not the authenticated Learner
 * shell) and its Verify-checklist card exactly (Issued by/to/on/using, Accepted on, Last
 * updated). The board has no separate issued/accepted timestamp in this app's data model (no
 * acceptance step exists), so both reuse `issuedAt` — the one real timestamp this certificate
 * has — rather than inventing a second one. The not-found state is undrawn on the board, so it
 * reuses the shared FND10 StateCard pattern instead of a bespoke design. */
export function VerifyCredentialView({ credential }: { credential: PublicCredential | null }) {
  return (
    <div
      data-system="learner"
      style={{ minHeight: '100vh', background: 'var(--surface-muted)', display: 'flex' }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          className="px-4 sm:px-7"
          style={{
            height: 64,
            borderBottom: '1px solid var(--nfcap-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#fff',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: '#1f2328',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="shield" className="h-4 w-4" stroke="#fff" />
          </div>
          <span
            style={{
              fontFamily: 'Geist, sans-serif',
              fontWeight: 700,
              fontSize: 16.5,
              letterSpacing: '-0.01em',
              color: '#1f2328',
            }}
          >
            NFCAP
          </span>
          <div style={{ flex: 1 }} />
          <span className="hidden sm:inline" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            Public credential verification — no sign-in required
          </span>
        </div>

        <div
          style={{
            maxWidth: 620,
            margin: '0 auto',
            padding: '56px 24px',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            alignItems: 'center',
          }}
        >
          {credential ? (
            <>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 'var(--nfcap-radius-lg)',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--nfcap-shadow-md)',
                }}
              >
                <Icon name="shield" className="h-11 w-11" stroke="#b45309" strokeWidth={1.5} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Geist, sans-serif' }}>
                  {credential.courseTitle}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 4 }}>
                  Awarded to {credential.learnerName}
                </div>
              </div>

              <span className="badge-complete" style={{ fontSize: 13, padding: '6px 14px' }}>
                ✓ Verified credential
              </span>

              <div
                style={{
                  background: '#fff',
                  border: '1px solid var(--nfcap-border)',
                  borderRadius: 'var(--nfcap-radius-lg)',
                  boxShadow: 'var(--nfcap-shadow-sm)',
                  padding: '24px 28px',
                  width: '100%',
                }}
              >
                <VerifyRow label="Issued by" value="NFCAP — Residential Flooring Apprenticeship" />
                <VerifyRow label="Issued to" value={credential.learnerName} />
                <VerifyRow label="Issued on" value={formatDate(credential.issuedAt)} />
                <VerifyRow
                  label="Issued using"
                  value={`${credential.moduleCount}-module course, evidence-reviewed`}
                />
                <VerifyRow label="Accepted on" value={formatDate(credential.issuedAt)} />
                <VerifyRow label="Last updated" value={formatDate(credential.issuedAt)} last />
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: 'var(--ink-muted)',
                  textAlign: 'center',
                  maxWidth: 460,
                }}
              >
                This page confirms the credential above was genuinely issued by NFCAP to the named
                apprentice. No account or sign-in needed — anyone with this link can check it, the
                way an employer or workforce board would.
              </p>
            </>
          ) : (
            <StateCard
              icon={<Icon name="alert-circle" className="h-6 w-6" />}
              title="Credential not found"
              description="This link is invalid or the credential's owner has stopped sharing it."
              tone="problem"
            />
          )}
        </div>

        <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 24px', width: '100%' }}>
          <LearnerFooter maxWidth={620} nested />
        </div>
      </div>
    </div>
  );
}

function VerifyRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 0',
        borderBottom: last ? 'none' : '1px solid var(--nfcap-border)',
        fontSize: 13.5,
      }}
    >
      <span style={{ color: 'var(--ink-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
