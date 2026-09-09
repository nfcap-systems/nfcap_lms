import { Card, CardContent } from '@/components/ui';
import { Icon } from '@/components/icons';
import { CertificateCard } from '@/components/learner/CertificateCard';
import type { Credential } from '@/lib/data/credentials';

export function CertificatesView({
  credentials,
  learnerName,
}: {
  credentials: Credential[];
  learnerName: string;
}) {
  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-10">
          <div className="flex size-10 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
            <Icon name="award" className="size-5" />
          </div>
          <h2 className="text-base font-semibold text-brand-heading">No certificates yet</h2>
          <p className="max-w-md text-sm text-text-secondary">
            Complete a course&apos;s lessons, pass its Knowledge Assessment, and submit Practical
            Evidence. Once NFCAP staff verify it, your certificate appears here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {credentials.map((credential) => (
        <CertificateCard
          key={credential.course.id}
          credential={credential}
          learnerName={learnerName}
        />
      ))}
    </div>
  );
}
