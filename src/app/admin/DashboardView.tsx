'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { getInitials } from '@/lib/utils';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';
import type { LearnerRecord } from '@/lib/data/learners';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import type { UpcomingAppointment, LearnerFundingStatus } from '@/lib/data/wioa';
import { Badge } from '@/components/ui';
import { Icon } from '@/components/icons';
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
  upcomingAppointments: UpcomingAppointment[];
  fundingStatusByLearner: Record<string, LearnerFundingStatus>;
  fundedCaseCount: number;
  adminName: string;
};

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const fundingStatusBadge: Record<
  LearnerFundingStatus,
  { tone: 'success' | 'pending' | 'neutral'; label: string }
> = {
  funded: { tone: 'success', label: '● Funded' },
  pending: { tone: 'pending', label: '● Pending review' },
  wioa_interest: { tone: 'pending', label: '● WIOA interest' },
  self_pay: { tone: 'neutral', label: 'Self-pay' },
};

const DAY_MS = 86_400_000;

/** A learner's most-recently-active enrolled course, by the most recent real timestamp we have
 * (enrollment, evidence submission/review, or quiz attempt) — lesson-completion events have a
 * real `completedAt` in the DB (prisma/schema.prisma's CompletedLesson) but aren't surfaced on
 * `CourseProgress.completedLessonIds` (just an id array), so a lesson-only-progress learner with
 * no other activity won't update this timestamp. Flagged in docs/plans/admin-ui-parity.md rather
 * than silently treated as complete coverage. */
function lastActivity(
  courses: AdminCourse[],
  progress: Record<string, CourseProgress>,
): { course: AdminCourse; progress: CourseProgress; at: number } | null {
  let best: { course: AdminCourse; progress: CourseProgress; at: number } | null = null;
  for (const course of courses) {
    const p = progress[course.id];
    if (!p?.enrolled) continue;
    const candidates = [
      new Date(p.enrolledAt).getTime(),
      p.evidence ? new Date(p.evidence.submittedAt).getTime() : 0,
      p.evidence?.statusUpdatedAt ? new Date(p.evidence.statusUpdatedAt).getTime() : 0,
      p.quizAttempt ? new Date(p.quizAttempt.submittedAt).getTime() : 0,
    ];
    const at = Math.max(...candidates);
    if (!best || at > best.at) best = { course, progress: p, at };
  }
  return best;
}

function formatRelative(at: number): string {
  const hours = (Date.now() - at) / (1000 * 60 * 60);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  // Pinned to 'en-US' rather than the environment's default locale (`undefined`) — the server's
  // locale and the browser's can disagree (e.g. en-US "Nov 25" vs en-GB "25 Nov"), which is a
  // real SSR/hydration text mismatch (React error #418) that forces this whole page to discard
  // and re-render client-side. That's what caused the admin shell's border/Quick Create button
  // to intermittently go missing on first load — confirmed via the browser console, not guessed.
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Real month-over-month delta: current count vs the count whose real timestamp was already
 * ≥30 days old. Returns null when there's no honest basis for a percentage (no data 30 days ago
 * to divide by) — callers render a neutral state rather than a fabricated number. */
function trendPct(current: number, thirtyDaysAgo: number): { pct: number; up: boolean } | null {
  if (thirtyDaysAgo === 0) return null;
  const pct = Math.round(((current - thirtyDaysAgo) / thirtyDaysAgo) * 100);
  return { pct, up: pct >= 0 };
}

function TrendBadge({ trend }: { trend: { pct: number; up: boolean } | null }) {
  if (!trend) {
    return (
      <span
        className="trend"
        style={{ background: 'var(--surface-muted)', color: 'var(--ink-faint)' }}
      >
        —
      </span>
    );
  }
  return (
    <span
      className="trend"
      style={{
        background: trend.up ? 'var(--status-complete-bg)' : 'var(--status-problem-bg)',
        color: trend.up ? 'var(--status-complete)' : 'var(--status-problem)',
      }}
    >
      <Icon name={trend.up ? 'chevron-up' : 'chevron-down'} className="h-3 w-3" />
      {Math.abs(trend.pct)}% vs last month
    </span>
  );
}

export function DashboardView({
  courses,
  learners,
  progressByLearner,
  upcomingAppointments,
  fundingStatusByLearner,
  fundedCaseCount,
  adminName,
}: DashboardProps) {
  const [now] = useState(() => Date.now());
  const cutoff30 = now - 30 * DAY_MS;

  const pendingReviews = learners
    .flatMap((learner) => {
      const progress = progressByLearner[learner.id] ?? {};
      return courses
        .filter((c) => progress[c.id]?.evidence?.status === 'pending')
        .map((c) => ({ learner, course: c, evidence: progress[c.id]!.evidence! }));
    })
    .sort(
      (a, b) =>
        new Date(a.evidence.submittedAt).getTime() - new Date(b.evidence.submittedAt).getTime(),
    );

  let enrolledNow = 0;
  let enrolledThirtyDaysAgo = 0;
  for (const learner of learners) {
    const progress = progressByLearner[learner.id] ?? {};
    for (const c of courses) {
      const p = progress[c.id];
      if (!p?.enrolled) continue;
      enrolledNow += 1;
      if (new Date(p.enrolledAt).getTime() <= cutoff30) enrolledThirtyDaysAgo += 1;
    }
  }

  const learnersThirtyDaysAgo = learners.filter((l) => l.createdAt.getTime() <= cutoff30).length;

  const kpis = [
    {
      label: 'Total Learners',
      value: learners.length,
      icon: 'users' as const,
      trend: trendPct(learners.length, learnersThirtyDaysAgo),
    },
    {
      label: 'Active Enrollments',
      value: enrolledNow,
      icon: 'book' as const,
      trend: trendPct(enrolledNow, enrolledThirtyDaysAgo),
    },
    {
      label: 'Pending Evidence Reviews',
      value: pendingReviews.length,
      icon: 'clock' as const,
      // No status-history table for EvidenceSubmission — "pending 30 days ago" can't be
      // reconstructed from a live count, only from an event log this app doesn't have. Honest
      // omission, not a missed computation (docs/plans/admin-ui-parity.md).
      trend: null,
    },
    {
      label: 'Funded Cases (WIOA)',
      value: fundedCaseCount,
      icon: 'bar-chart' as const,
      // No status-history table for WioaCase either — same honest-omission reasoning as
      // Pending Evidence Reviews above.
      trend: null,
    },
  ];

  const evidenceByWeek = (() => {
    const buckets = [0, 1, 2, 3].map(() => ({ approved: 0, pending: 0, rejected: 0 }));
    for (const learner of learners) {
      const progress = progressByLearner[learner.id] ?? {};
      for (const course of courses) {
        const evidence = progress[course.id]?.evidence;
        if (!evidence) continue;
        const daysAgo = (now - new Date(evidence.submittedAt).getTime()) / DAY_MS;
        if (daysAgo < 0 || daysAgo >= 28) continue;
        const weekFromNow = Math.floor(daysAgo / 7); // 0 = this week ... 3 = 3 weeks ago
        const bucket = buckets[3 - weekFromNow];
        if (evidence.status === 'approved') bucket.approved += 1;
        else if (evidence.status === 'pending') bucket.pending += 1;
        else if (evidence.status === 'rejected') bucket.rejected += 1;
      }
    }
    return buckets.map((b, i) => ({ week: `Wk ${i + 1}`, ...b }));
  })();

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

  const recentLearners = learners
    .map((learner) => {
      const progress = progressByLearner[learner.id] ?? {};
      const activity = lastActivity(courses, progress);
      return { learner, activity };
    })
    .filter((row) => row.activity !== null)
    .sort((a, b) => b.activity!.at - a.activity!.at)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      <div className="pagehdr">
        <div>
          <h1>Admin Dashboard</h1>
          {/* suppressHydrationWarning: the server's local hour and the browser's local hour can
              fall on opposite sides of a morning/afternoon/evening boundary (different
              timezones, or just clock skew), which made this text mismatch between SSR and
              hydration and threw React error #418 — that hydration failure forced React to
              discard and re-render the whole tree client-side, which is what made the sidebar's
              Quick Create button and borders appear to vanish on first load until a refresh.
              The text itself is cosmetic and safe to let differ for one render. */}
          <p suppressHydrationWarning>
            {timeOfDayGreeting()}, {adminName}. Here&apos;s today&apos;s overview.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <Link href="/admin/reviews" className="btn-primary btn-sm">
            Review Queue
          </Link>
          {/* No admin-initiated learner-creation flow exists anywhere in the app yet (learners
              sign up themselves) — disabled rather than fabricated, same pattern as Pathway's
              "Preview as Learner" button. */}
          <button type="button" className="btn-secondary btn-sm" disabled title="Not yet built">
            Add Learner
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        {kpis.map((kpi) => (
          <div className="mcard" key={kpi.label}>
            <div className="ic">
              <Icon name={kpi.icon} className="h-4 w-4" />
            </div>
            <span className="l">{kpi.label}</span>
            <span className="n">{kpi.value}</span>
            <TrendBadge trend={kpi.trend} />
          </div>
        ))}
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 16, alignItems: 'stretch' }}
      >
        <ReviewQueueCard items={pendingReviews} />
        <EvidenceByWeekChart data={evidenceByWeek} />
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 16, alignItems: 'stretch' }}
      >
        <RecentLearnersTable
          rows={recentLearners}
          courses={courses}
          totalLearners={learners.length}
          fundingStatusByLearner={fundingStatusByLearner}
        />
        <UpcomingAppointmentsCard appointments={upcomingAppointments} learners={learners} />
      </div>

      <PerformanceHighlights data={performanceByCourse} />
    </div>
  );
}

function daysWaiting(submittedAt: string): number {
  return Math.floor((Date.now() - new Date(submittedAt).getTime()) / DAY_MS);
}

function urgencyTone(days: number): 'red' | 'yellow' | 'green' {
  if (days >= 3) return 'red';
  if (days >= 1) return 'yellow';
  return 'green';
}

const urgencyLabel: Record<'red' | 'yellow' | 'green', string> = {
  red: 'Overdue',
  yellow: 'Due Soon',
  green: 'New',
};

function ReviewQueueCard({
  items,
}: {
  items: {
    learner: LearnerRecord;
    course: AdminCourse;
    evidence: { submittedAt: string; status: string };
  }[];
}) {
  return (
    <div className="panel" style={{ height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 2,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>Review Queue</div>
        <Link
          href="/admin/reviews"
          style={{
            fontSize: 12,
            color: 'var(--ink-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          View Full Queue
          <Icon name="chevron-right" className="h-3 w-3" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p
          style={{
            padding: '32px 0',
            textAlign: 'center',
            fontSize: 13.5,
            color: 'var(--ink-muted)',
          }}
        >
          No practical evidence is waiting on review.
        </p>
      ) : (
        <div>
          {items.slice(0, 6).map(({ learner, course, evidence }) => {
            const days = daysWaiting(evidence.submittedAt);
            const tone = urgencyTone(days);
            return (
              <Link
                key={`${learner.id}-${course.id}`}
                href={`/admin/learners/${learner.id}`}
                className="sched-row"
              >
                <div className="sched-left">
                  <div className={`sched-bar ${tone}`} />
                  <div className="sched-time">
                    <div className="main">{days === 0 ? 'Today' : `${days}d waiting`}</div>
                    <div className="sub">
                      {new Date(evidence.submittedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div className="sched-mid">
                  <div className="title">{learner.name}</div>
                  <div className="sub">{course.title}</div>
                </div>
                <span className={`badge-sq ${tone}`}>{urgencyLabel[tone]}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const evidenceWeekChartConfig = {
  approved: { label: 'Approved', color: 'var(--chart-approved)' },
  pending: { label: 'Pending', color: 'var(--chart-pending)' },
  rejected: { label: 'Rejected', color: 'var(--chart-rejected)' },
} satisfies ChartConfig;

/** 7d/30d/Today switch matches the board (ADM02) visually; only "7d" is wired to real data this
 * batch — the other two are inert placeholders, flagged rather than faked
 * (docs/plans/admin-ui-parity.md). */
function EvidenceByWeekChart({
  data,
}: {
  data: { week: string; approved: number; pending: number; rejected: number }[];
}) {
  const [range, setRange] = useState<'today' | '7d' | '30d'>('7d');
  const hasData = data.some((d) => d.approved + d.pending + d.rejected > 0);

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>Evidence submissions by week</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="segrange">
            <button
              type="button"
              className={range === 'today' ? 'on' : undefined}
              onClick={() => setRange('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={range === '7d' ? 'on' : undefined}
              onClick={() => setRange('7d')}
            >
              7d
            </button>
            <button
              type="button"
              className={range === '30d' ? 'on' : undefined}
              onClick={() => setRange('30d')}
            >
              30d
            </button>
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 16,
          fontSize: 11.5,
          color: 'var(--ink-muted)',
          marginBottom: 10,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--chart-approved)' }}
          />
          Approved
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--chart-pending)' }}
          />
          Pending
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--chart-rejected)' }}
          />
          Rejected
        </span>
      </div>
      {!hasData ? (
        <p
          style={{
            padding: '32px 0',
            textAlign: 'center',
            fontSize: 13.5,
            color: 'var(--ink-muted)',
          }}
        >
          No practical evidence submitted in the last 4 weeks.
        </p>
      ) : (
        <ChartContainer config={evidenceWeekChartConfig} className="h-55 w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--nfcap-border)" />
            <XAxis
              axisLine={false}
              dataKey="week"
              tickLine={false}
              tickMargin={10}
              tick={{ fill: 'var(--ink-muted)' }}
            />
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
    </div>
  );
}

function RecentLearnersTable({
  rows,
  courses,
  totalLearners,
  fundingStatusByLearner,
}: {
  rows: {
    learner: LearnerRecord;
    activity: { course: AdminCourse; progress: CourseProgress; at: number } | null;
  }[];
  courses: AdminCourse[];
  totalLearners: number;
  fundingStatusByLearner: Record<string, LearnerFundingStatus>;
}) {
  return (
    <div
      className="panel"
      style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden', height: '100%' }}
    >
      <div
        style={{
          padding: '16px 20px',
          fontWeight: 600,
          fontSize: 14.5,
          borderBottom: '1px solid var(--nfcap-border)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        Recent learners
        <Link href="/admin/learners" style={{ fontSize: 12.5, fontWeight: 600 }}>
          View all learners →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p
          style={{
            padding: '32px 20px',
            textAlign: 'center',
            fontSize: 13.5,
            color: 'var(--ink-muted)',
          }}
        >
          No learner activity yet.
        </p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th className="tcol-check">
                  <span className="tcheck" aria-label="Select all" />
                </th>
                <th>Name</th>
                <th>Pathway</th>
                <th>Progress</th>
                <th>Last activity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ learner, activity }) => {
                const status = getCourseStatus(activity!.course, activity!.progress);
                const funding = fundingStatusByLearner[learner.id] ?? 'self_pay';
                const fundingBadge = fundingStatusBadge[funding];
                return (
                  <tr key={learner.id}>
                    <td className="tcol-check">
                      <span className="tcheck" aria-label="Select row" />
                    </td>
                    <td>
                      <Link href={`/admin/learners/${learner.id}`} className="rowname">
                        <div className="av-wrap">
                          <div className="av">{getInitials(learner.name)}</div>
                        </div>
                        <div>{learner.name}</div>
                      </Link>
                    </td>
                    <td>{activity!.course.category}</td>
                    <td>
                      <Badge tone={courseStatusTone[status]}>{courseStatusLabel[status]}</Badge>
                    </td>
                    <td style={{ color: 'var(--ink-muted)' }}>{formatRelative(activity!.at)}</td>
                    <td>
                      <Badge tone={fundingBadge.tone}>{fundingBadge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-footer">
            <span>
              Showing {rows.length} of {totalLearners}
            </span>
            <Link href="/admin/learners" style={{ color: 'var(--ink-muted)' }}>
              View full roster →
            </Link>
          </div>
        </>
      )}
      {courses.length === 0 && (
        <p style={{ padding: '0 20px 16px', fontSize: 12, color: 'var(--ink-faint)' }}>
          No courses yet.
        </p>
      )}
    </div>
  );
}

const appointmentTypeLabel: Record<UpcomingAppointment['type'], string> = {
  ORIENTATION: 'Orientation',
  INTAKE: 'Intake',
  FOLLOWUP: 'Follow-up',
};

function UpcomingAppointmentsCard({
  appointments,
  learners,
}: {
  appointments: UpcomingAppointment[];
  learners: LearnerRecord[];
}) {
  const learnerNameById = new Map(learners.map((l) => [l.id, l.name]));
  return (
    <div className="panel" style={{ height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>Upcoming WIOA Appointments</div>
        {/* No admin calendar view exists anywhere in the app yet — same honest-disclosure
            pattern as the disabled "Add Learner" button above, not a fabricated destination. */}
        <span
          style={{
            fontSize: 12,
            color: 'var(--ink-faint)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Not yet built"
        >
          View Calendar
          <Icon name="chevron-right" className="h-3 w-3" />
        </span>
      </div>
      {appointments.length === 0 ? (
        <p
          style={{
            padding: '32px 0',
            textAlign: 'center',
            fontSize: 13.5,
            color: 'var(--ink-muted)',
          }}
        >
          No upcoming appointments scheduled.
        </p>
      ) : (
        <div>
          {appointments.map((a) => (
            <div className="evt-row" key={a.id}>
              <div className="evt-left">
                <div className="evt-date">
                  <div className="mon">
                    {new Date(a.scheduledAt).toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                  <div className="day">{new Date(a.scheduledAt).getDate()}</div>
                </div>
                <div className="evt-mid">
                  <div className="title">
                    {learnerNameById.get(a.learnerId) ?? 'Unknown learner'}
                  </div>
                  <div className="sub">
                    {new Date(a.scheduledAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
              <span className="badge-outline">{appointmentTypeLabel[a.type]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const performanceChartConfig = {
  avgScore: { label: 'Avg. Score', color: 'var(--nfcap-accent)' },
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
        fill="color-mix(in oklch, var(--nfcap-accent) 16%, transparent)"
        height={barHeight}
        rx={radius}
        width={width}
        x={x}
        y={barY}
      />
      <rect
        fill="var(--nfcap-accent)"
        height={barHeight}
        rx={radius}
        width={fillWidth}
        x={x}
        y={barY}
      />
      {payload.topScorers.map((student, index) => (
        <g key={`${student.initials}-${index}`}>
          <circle
            cx={avatarStart + index * 14 + avatarSize / 2}
            cy={avatarY + avatarSize / 2}
            r={avatarSize / 2}
            fill="var(--nfcap-accent-contrast)"
            fillOpacity={0.9}
          />
          <text
            x={avatarStart + index * 14 + avatarSize / 2}
            y={avatarY + avatarSize / 2 + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fontWeight={600}
            fill="var(--nfcap-accent)"
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
        fill="var(--ink)"
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
    <div className="panel">
      <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 10 }}>
        Performance Highlights
      </div>
      {data.length === 0 ? (
        <p
          style={{
            padding: '32px 0',
            textAlign: 'center',
            fontSize: 13.5,
            color: 'var(--ink-muted)',
          }}
        >
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
            <CartesianGrid horizontal={false} strokeDasharray="4 4" stroke="var(--nfcap-border)" />
            <XAxis
              axisLine={false}
              domain={[0, 100]}
              tickLine={false}
              tickMargin={10}
              type="number"
              tick={{ fill: 'var(--ink-muted)' }}
            />
            <YAxis
              axisLine={false}
              dataKey="course"
              tickLine={false}
              tickMargin={10}
              type="category"
              width={140}
              tick={{ fill: 'var(--ink-muted)' }}
            />
            <Bar dataKey="avgScore" shape={<PerformanceHighlightBar />} />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
