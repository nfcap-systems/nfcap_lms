'use client';

import { useRouter } from 'next/navigation';
import { Badge, Card } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { PathwaySummary } from '@/lib/data/pathway';

export function PathwayListView({ summary }: { summary: PathwaySummary }) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-colors hover:border-brand-primary/40"
      onClick={() => router.push('/admin/pathway/apprenticeship')}
    >
      <div className="flex h-28 items-center justify-center bg-brand-primary/10 text-brand-primary">
        <Icon name="compass" className="size-10" />
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">Published</Badge>
          <span className="text-xs text-text-muted">Linear pathway · one track</span>
        </div>

        <div>
          <h3 className="text-base font-semibold text-brand-heading">
            NFCAP Apprenticeship Pathway
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Safety & Tools → Flooring Fundamentals → Tile Installation → Professionalism.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t border-border-subtle pt-4">
          <SummaryStat label="Contents">
            <Badge tone="info">
              {summary.courseCount} {summary.courseCount === 1 ? 'Course' : 'Courses'}
            </Badge>
            {summary.restrictedCount > 0 && (
              <Badge tone="restricted">
                <Icon name="lock" className="size-3" />
                {summary.restrictedCount} Restricted
              </Badge>
            )}
          </SummaryStat>

          <SummaryStat label="Total Learners">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <Icon name="users" className="size-4 text-text-muted" />
              {summary.totalLearners}
            </span>
          </SummaryStat>

          <SummaryStat label="Completion Rate">
            <span className="text-sm font-medium text-status-success-text">
              {summary.completionRate}% completed this path
            </span>
          </SummaryStat>
        </div>
      </div>
    </Card>
  );
}

function SummaryStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-text-muted uppercase">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
