'use client';

import Link from 'next/link';
import { ChevronRight, Compass, Users } from 'lucide-react';

import { Badge } from '@/components/admin-ui/badge';
import { Card } from '@/components/admin-ui/card';
import { PathwayView } from '@/components/admin/PathwayView';
import type { AdminCourse } from '@/lib/data/courses';
import type { PathwaySummary } from '@/lib/data/pathway';

export function PathwayDetailView({
  courses,
  summary,
}: {
  courses: AdminCourse[];
  summary: PathwaySummary;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/pathway" className="hover:text-foreground hover:underline">
          Pathway
        </Link>
        <ChevronRight className="size-3" />
        <span>Apprenticeship</span>
      </div>

      <div className="flex h-24 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-9" />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">NFCAP Apprenticeship Pathway</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="success">Published</Badge>
            <span>Linear pathway · one track</span>
          </div>
        </div>

        <button
          type="button"
          disabled
          title="Not yet implemented — role-preview isn't supported in this prototype yet"
          aria-disabled="true"
          className="inline-flex h-8 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-input bg-transparent px-3 text-sm font-medium text-muted-foreground opacity-60"
        >
          <Compass className="size-4" />
          Preview as Learner
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-8 px-4">
          <SummaryStat label="Total Content Summary">
            <Badge variant="outline">
              {summary.courseCount} {summary.courseCount === 1 ? 'Course' : 'Courses'}
            </Badge>
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
      </Card>

      <PathwayView courses={courses} />

      <Card>
        <div className="flex flex-col gap-2 px-4">
          <h2 className="text-sm font-semibold text-foreground">Pathway Description</h2>
          <p className="text-sm text-muted-foreground">
            NFCAP&apos;s federally recognized flooring apprenticeship: learners move through Safety
            & Tools and Flooring Fundamentals (open, self-enroll), then Tile Installation and
            Professionalism (restricted — unlocked after completing the course before it). Each
            course closes with a knowledge assessment and verified practical evidence before the
            learner moves on.
          </p>
        </div>
      </Card>
    </div>
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
