'use client';

import { useRouter } from 'next/navigation';
import { Lock, Users, Compass } from 'lucide-react';

import { Badge } from '@/components/admin-ui/badge';
import { Card } from '@/components/admin-ui/card';
import type { PathwaySummary } from '@/lib/data/pathway';

export function PathwayListView({ summary }: { summary: PathwaySummary }) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer overflow-hidden py-0 transition-colors hover:border-primary/40"
      onClick={() => router.push('/admin/pathway/apprenticeship')}
    >
      <div className="flex h-28 items-center justify-center bg-primary/10 text-primary">
        <Compass className="size-10" />
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Published</Badge>
          <span className="text-xs text-muted-foreground">Linear pathway · one track</span>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground">NFCAP Apprenticeship Pathway</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Safety & Tools → Flooring Fundamentals → Tile Installation → Professionalism.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t pt-4">
          <SummaryStat label="Contents">
            <Badge variant="outline">
              {summary.courseCount} {summary.courseCount === 1 ? 'Course' : 'Courses'}
            </Badge>
            {summary.restrictedCount > 0 && (
              <Badge variant="outline">
                <Lock className="size-3" />
                {summary.restrictedCount} Restricted
              </Badge>
            )}
          </SummaryStat>

          <SummaryStat label="Total Learners">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Users className="size-4 text-muted-foreground" />
              {summary.totalLearners}
            </span>
          </SummaryStat>

          <SummaryStat label="Completion Rate">
            <span className="text-sm font-medium text-foreground">
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
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
