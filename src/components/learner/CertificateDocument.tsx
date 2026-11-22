import { Icon } from '@/components/icons';
import type { Credential } from '@/lib/data/credentials';

export function CertificateDocument({
  credential,
  learnerName,
}: {
  credential: Credential;
  learnerName: string;
}) {
  const { course, evidence, certificateId } = credential;
  const issuedDate = new Date(evidence.statusUpdatedAt ?? evidence.submittedAt).toLocaleDateString(
    undefined,
    { month: 'long', day: 'numeric', year: 'numeric' },
  );

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '2px solid var(--accent)',
        background: 'var(--surface)',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          margin: '0 auto',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'var(--accent-contrast)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="award" className="h-7 w-7" />
      </div>
      <p style={{ marginTop: 16, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-muted)' }}>
        NFCAP · Certificate of Completion
      </p>
      <h2 style={{ marginTop: 12, fontSize: 24, fontWeight: 600, color: 'var(--ink)' }}>{learnerName}</h2>
      <p style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-muted)' }}>
        has successfully completed the requirements for
      </p>
      <p style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{course.title}</p>
      <p style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-muted)' }}>{course.category}</p>

      <div
        style={{
          margin: '24px auto 0',
          maxWidth: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          paddingTop: 16,
          fontSize: 12,
          color: 'var(--ink-muted)',
        }}
      >
        <span>Issued {issuedDate}</span>
        <span>{certificateId}</span>
      </div>
    </div>
  );
}
