import { Badge, Card, CardContent } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { Credential } from '@/lib/data/credentials';

export function PortfolioView({ credentials }: { credentials: Credential[] }) {
  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-10">
          <div className="flex size-10 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
            <Icon name="briefcase" className="size-5" />
          </div>
          <h2 className="text-base font-semibold text-brand-heading">Nothing here yet</h2>
          <p className="max-w-md text-sm text-text-secondary">
            Once NFCAP staff verify a piece of Practical Evidence you&apos;ve submitted, it will
            appear here as proof of your demonstrated skill.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {credentials.map(({ course, evidence }) => {
        const verifiedDate = new Date(
          evidence.statusUpdatedAt ?? evidence.submittedAt,
        ).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        return (
          <Card key={course.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    {course.category}
                  </p>
                  <h3 className="text-base font-semibold text-brand-heading">{course.title}</h3>
                </div>
                <Badge tone="success">
                  <Icon name="check" className="size-3" />
                  Verified {verifiedDate}
                </Badge>
              </div>

              <p className="text-sm text-text-secondary">{evidence.description}</p>

              {evidence.fileName && (
                <div className="flex w-fit items-center gap-2 rounded-lg border border-border-subtle bg-bg-subtle px-3 py-2 text-sm text-text-secondary">
                  <Icon name="paperclip" className="size-4 shrink-0 text-brand-primary" />
                  {evidence.fileName}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
