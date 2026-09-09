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
    <div className="rounded-2xl border-2 border-brand-primary bg-bg-card p-8 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-accent text-on-brand">
        <Icon name="award" className="size-7" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        NFCAP · Certificate of Completion
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-brand-heading">{learnerName}</h2>
      <p className="mt-2 text-sm text-text-secondary">
        has successfully completed the requirements for
      </p>
      <p className="mt-1 text-lg font-semibold text-brand-heading">{course.title}</p>
      <p className="mt-1 text-xs text-text-muted">{course.category}</p>

      <div className="mx-auto mt-6 flex max-w-xs items-center justify-between border-t border-border-subtle pt-4 text-xs text-text-muted">
        <span>Issued {issuedDate}</span>
        <span>{certificateId}</span>
      </div>
    </div>
  );
}
