import { Badge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { WIOA_STATUS_LABEL } from '@/lib/wioa/status';
import type { WioaCaseRecord } from '@/lib/data/wioa';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** LRN11-Account's sidebar — profile summary, a security tip, and a support link. Board's
 * "Learner ID" row is left out: there's no learner-code field anywhere in the schema (only the
 * Supabase auth user id, a uuid not meant for display), and inventing a code format would be
 * fabricating data the app doesn't actually have. */
export function LearnerAccountSidebar({
  name,
  memberSince,
  latestWioaCase,
}: {
  name: string;
  memberSince: Date;
  latestWioaCase: WioaCaseRecord | null;
}) {
  const memberSinceLabel = memberSince.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="lrn-side-panel" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--nfcap-accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          {initials(name)}
        </div>
        <div>
          <b style={{ fontSize: 15, color: 'var(--ink)' }}>{name}</b>
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2 }}>Learner</div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
              padding: '8px 0',
              borderBottom: '1px solid var(--nfcap-border)',
            }}
          >
            <span style={{ color: 'var(--ink-muted)' }}>Member since</span>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{memberSinceLabel}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
              padding: '8px 0',
            }}
          >
            <span style={{ color: 'var(--ink-muted)' }}>Funding status</span>
            {latestWioaCase ? (
              <Badge tone="success">{WIOA_STATUS_LABEL[latestWioaCase.status]}</Badge>
            ) : (
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>No case on file</span>
            )}
          </div>
        </div>
      </div>

      <div
        className="lrn-side-panel"
        style={{ background: 'linear-gradient(135deg, #eff6ff, #f8fafc)', borderColor: '#bfdbfe' }}
      >
        <div className="lrn-side-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="lock" className="h-3.5 w-3.5" style={{ color: 'var(--nfcap-accent)' }} />
            Keep your account secure
          </h3>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Use a password you don&apos;t reuse elsewhere. Changing it signs out every other device
          immediately.
        </div>
      </div>

      <div className="lrn-side-panel">
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          Need help with your account?
        </div>
        {/* No real support contact exists anywhere in the app yet (LearnerFooter's own
            "Help & Support" link is the same bare placeholder) — matching that precedent
            rather than inventing an address. */}
        <a
          href="#"
          style={{
            fontSize: 12.5,
            color: 'var(--nfcap-accent)',
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          Contact NFCAP Support →
        </a>
      </div>
    </aside>
  );
}
