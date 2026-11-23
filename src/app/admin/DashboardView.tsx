'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { getInitials } from '@/lib/utils';
import type { LearnerRecord } from '@/lib/data/learners';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import { Badge } from '@/components/admin-ui/badge';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/admin-ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/admin-ui/chart';

type DashboardProps = {
  courses: AdminCourse[];
  learners: LearnerRecord[];
  progressByLearner: Record<string, Record<string, CourseProgress>>;
};

export function DashboardView({ courses, learners, progressByLearner }: DashboardProps) {
  const pendingReviews = learners
    .flatMap((learner) => {
      const progress = progressByLearner[learner.id] ?? {};
      return courses
        .filter((c) => progress[c.id]?.evidence?.status === 'pending')
        .map((c) => ({ learner, course: c, evidence: progress[c.id]!.evidence! }));
    })
    .sort(
      (a, b) =>
        new Date(b.evidence.submittedAt).getTime() - new Date(a.evidence.submittedAt).getTime(),
    );

  let activeLearners = 0;
  for (const learner of learners) {
    const progress = progressByLearner[learner.id] ?? {};
    const hasStarted = courses.some((c) => {
      const p = progress[c.id];
      return p?.enrolled && (p.completedLessonIds.length > 0 || p.quizAttempt || p.evidence);
    });
    if (hasStarted) activeLearners += 1;
  }
  const activeLearnerRate =
    learners.length === 0 ? 0 : Math.round((activeLearners / learners.length) * 100);

  const kpis = [
    { label: 'Learners', value: learners.length },
    { label: 'Courses', value: courses.length },
    { label: 'Pending Reviews', value: pendingReviews.length },
    {
      label: 'Active Learner Rate',
      value: `${activeLearnerRate}%`,
      caption: `${activeLearners} of ${learners.length}`,
    },
  ];

  const evidenceByCourse = courses
    .map((course) => {
      let approved = 0;
      let pending = 0;
      let rejected = 0;
      for (const learner of learners) {
        const evidence = progressByLearner[learner.id]?.[course.id]?.evidence;
        if (!evidence) continue;
        if (evidence.status === 'approved') approved += 1;
        else if (evidence.status === 'pending') pending += 1;
        else if (evidence.status === 'rejected') rejected += 1;
      }
      return {
        course: course.title,
        approved,
        pending,
        rejected,
        total: approved + pending + rejected,
      };
    })
    .filter((row) => row.total > 0);

  const performanceByCourse = courses
    .map((course) => {
      const scored = learners
        .map((learner) => ({
          learner,
          attempt: progressByLearner[learner.id]?.[course.id]?.quizAttempt,
        }))
        .filter(
          (row): row is { learner: LearnerRecord; attempt: NonNullable<typeof row.attempt> } =>
            Boolean(row.attempt),
        )
        .sort((a, b) => b.attempt.scorePercent - a.attempt.scorePercent);

      if (scored.length === 0) return null;

      const avgScore = Math.round(
        scored.reduce((sum, row) => sum + row.attempt.scorePercent, 0) / scored.length,
      );
      const topScorers = scored.slice(0, 3).map((row) => ({
        initials: getInitials(row.learner.name),
        name: row.learner.name,
        score: Math.round(row.attempt.scorePercent),
      }));

      return { course: course.title, avgScore, topScorers };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle className="text-sm">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl leading-none font-semibold tracking-tight text-foreground">
                {kpi.value}
              </span>
              {'caption' in kpi && kpi.caption && (
                <p className="mt-1 text-xs text-muted-foreground">{kpi.caption}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <NeedsReviewCard items={pendingReviews} />
        </div>
        <div className="xl:col-span-7">
          <EvidenceStatusChart data={evidenceByCourse} />
        </div>
      </div>

      <PerformanceHighlights data={performanceByCourse} />
    </div>
  );
}

function NeedsReviewCard({
  items,
}: {
  items: {
    learner: LearnerRecord;
    course: AdminCourse;
    evidence: { submittedAt: string; status: string };
  }[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Needs Review</CardTitle>
        <CardAction>
          <Link
            href="/admin/reviews"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No practical evidence is waiting on review.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.slice(0, 6).map(({ learner, course, evidence }) => (
              <Link
                key={`${learner.id}-${course.id}`}
                href={`/admin/learners/${learner.id}`}
                className="grid grid-cols-1 items-center gap-3 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[8rem_1fr_auto]"
              >
                <div className="flex gap-2">
                  <div className="w-1 shrink-0 rounded-md bg-yellow-500" />
                  <div className="text-xs text-nowrap">
                    <div className="font-medium text-foreground">
                      {new Date(evidence.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-muted-foreground">submitted</div>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="truncate text-sm leading-none font-medium text-foreground">
                    {learner.name}
                  </div>
                  <div className="truncate text-xs leading-none text-muted-foreground">
                    {course.title}
                  </div>
                </div>
                <Badge variant="warning" className="shrink-0">
                  Pending
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const evidenceChartConfig = {
  approved: { label: 'Approved', color: '#16a34a' },
  pending: { label: 'Pending', color: '#ca8a04' },
  rejected: { label: 'Rejected', color: 'var(--destructive)' },
} satisfies ChartConfig;

function EvidenceStatusChart({
  data,
}: {
  data: { course: string; approved: number; pending: number; rejected: number }[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Evidence Status by Course</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No practical evidence submitted yet.
          </p>
        ) : (
          <ChartContainer config={evidenceChartConfig} className="h-70 w-full">
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="course" tickLine={false} tickMargin={10} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar
                dataKey="approved"
                stackId="status"
                fill="var(--color-approved)"
                radius={[0, 0, 4, 4]}
              />
              <Bar dataKey="pending" stackId="status" fill="var(--color-pending)" />
              <Bar
                dataKey="rejected"
                stackId="status"
                fill="var(--color-rejected)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

const performanceChartConfig = {
  avgScore: { label: 'Avg. Score', color: 'var(--primary)' },
} satisfies ChartConfig;

function PerformanceHighlightBar({
  height = 0,
  payload,
  width = 0,
  x = 0,
  y = 0,
}: {
  height?: number;
  payload?: { course: string; avgScore: number; topScorers: { initials: string; score: number }[] };
  width?: number;
  x?: number;
  y?: number;
}) {
  if (!payload) return null;

  const barHeight = Math.min(32, height);
  const barY = y + (height - barHeight) / 2;
  const radius = barHeight / 2;
  const fillWidth = Math.max(width * (payload.avgScore / 100), 86);
  const avatarSize = 20;
  const avatarStart = x + 8;
  const avatarY = barY + (barHeight - avatarSize) / 2;

  return (
    <g>
      <rect
        fill="color-mix(in oklch, var(--primary) 16%, transparent)"
        height={barHeight}
        rx={radius}
        width={width}
        x={x}
        y={barY}
      />
      <rect fill="var(--primary)" height={barHeight} rx={radius} width={fillWidth} x={x} y={barY} />
      {payload.topScorers.map((student, index) => (
        <g key={`${student.initials}-${index}`}>
          <circle
            cx={avatarStart + index * 14 + avatarSize / 2}
            cy={avatarY + avatarSize / 2}
            r={avatarSize / 2}
            fill="var(--primary-foreground)"
            fillOpacity={0.9}
          />
          <text
            x={avatarStart + index * 14 + avatarSize / 2}
            y={avatarY + avatarSize / 2 + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fontWeight={600}
            fill="var(--primary)"
          >
            {student.initials}
          </text>
        </g>
      ))}
      <text
        dominantBaseline="middle"
        x={x + width - 10}
        y={barY + barHeight / 2 + 0.5}
        textAnchor="end"
        fontSize={11}
        fontWeight={500}
        fill="var(--foreground)"
      >
        {payload.avgScore}%
      </text>
    </g>
  );
}

function PerformanceHighlights({
  data,
}: {
  data: {
    course: string;
    avgScore: number;
    topScorers: { initials: string; name: string; score: number }[];
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Performance Highlights</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No quiz attempts recorded yet.
          </p>
        ) : (
          <ChartContainer config={performanceChartConfig} className="h-70 w-full">
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ bottom: 0, left: 0, right: 8, top: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="4 4" />
              <XAxis
                axisLine={false}
                domain={[0, 100]}
                tickLine={false}
                tickMargin={10}
                type="number"
              />
              <YAxis
                axisLine={false}
                dataKey="course"
                tickLine={false}
                tickMargin={10}
                type="category"
                width={140}
              />
              <Bar dataKey="avgScore" shape={<PerformanceHighlightBar />} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
