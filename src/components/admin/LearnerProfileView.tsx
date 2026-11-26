'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, Clipboard, Paperclip, X } from 'lucide-react';

import { Badge as AdminBadge, type badgeVariants } from '@/components/admin-ui/badge';
import { Button as AdminButton } from '@/components/admin-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin-ui/card';
import { Progress } from '@/components/admin-ui/progress';
import { Badge, CompletionRing, ProfileHeader, ProfileTabs, RowActionsMenu } from '@/components/ui';
import { DropdownMenuItem } from '@/components/admin-ui/dropdown-menu';
import { Icon } from '@/components/icons';
import { getInitials } from '@/lib/utils';
import type { AdminCourse } from '@/lib/data/courses';
import type { LearnerRecord } from '@/lib/data/learners';
import type { CourseProgress, CourseUnlockRecord } from '@/lib/data/progress';
import type { WioaCaseRecord, LearnerProfile, LearnerFundingStatus } from '@/lib/data/wioa';
import type { Credential } from '@/lib/data/credentials';
import type { CriterionReviewData } from '@/lib/data/criterionReview';
import { setEvidenceStatus, grantCourseUnlock, getEvidenceFileUrl } from '@/lib/actions/progress';
import { setLearnerCohort } from '@/lib/actions/cohorts';
import type { CohortOption } from '@/lib/data/cohorts';
import { courseLessonCount } from '@/lib/types';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';
import type { StatusTone } from '@/components/ui/Badge';
import type { VariantProps } from 'class-variance-authority';

const toneToBadgeVariant: Record<StatusTone, VariantProps<typeof badgeVariants>['variant']> = {
  neutral: 'outline',
  info: 'outline',
  pending: 'warning',
  success: 'success',
  danger: 'destructive',
  restricted: 'outline',
};

const fundingBadge: Record<LearnerFundingStatus, { className: string; label: string }> = {
  funded: { className: 'pbadge solid', label: 'Funded' },
  pending: { className: 'pbadge amber', label: 'Funding pending' },
  wioa_interest: { className: 'pbadge amber', label: 'WIOA interest' },
  self_pay: { className: 'pbadge', label: 'Self-pay' },
};

const fundingStatusLabel: Record<LearnerFundingStatus, (boardName?: string | null) => string> = {
  funded: (boardName) => `Funded${boardName ? ` — ${boardName}` : ''}`,
  pending: () => 'Funding under review',
  wioa_interest: () => 'WIOA interest — awaiting outreach',
  self_pay: () => 'Self-pay',
};

type Tab = 'overview' | 'personal' | 'enrollment' | 'funding' | 'evidence' | 'documents';

// Both pinned to 'en-US' — see the comment in src/app/admin/DashboardView.tsx: the environment's
// default locale (`undefined`) can differ between server and browser, causing a real
// SSR/hydration mismatch (React error #418).
function formatMonthYear(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LearnerProfileView({
  learner,
  courses,
  progress,
  courseUnlocks,
  criteriaCounts = {},
  cohortName,
  cohortId,
  cohorts,
  fundingStatus,
  wioaCases,
  credentials,
  learnerProfile,
  currentCourse,
  currentCourseCriteriaReview,
}: {
  learner: LearnerRecord;
  courses: AdminCourse[];
  progress: Record<string, CourseProgress>;
  /** Restricted-course access grants keyed by course slug — only relevant to the Course access
   * card below (docs/build/WIOA_BUILD_WORKFLOW.md Phase 4). */
  courseUnlocks?: Record<string, CourseUnlockRecord>;
  /** Course slug -> criteria count (src/lib/data/courses.ts). A course with any criteria routes
   * its evidence review to the real ADM11-PerCriterionReview screen (feature #7) instead of the
   * inline Approve/Reject below, which only remains for the (currently nonexistent) case of a
   * course with zero criteria. */
  criteriaCounts?: Record<string, number>;
  cohortName: string | null;
  /** The learner's current CohortMembership, if any — drives the Enrollment tab's assignment
   * select below. `cohorts` is every cohort to offer in that select. */
  cohortId: string | null;
  cohorts: CohortOption[];
  fundingStatus: LearnerFundingStatus;
  wioaCases: WioaCaseRecord[];
  credentials: Credential[];
  learnerProfile: LearnerProfile | null;
  currentCourse: AdminCourse | null;
  currentCourseCriteriaReview: CriterionReviewData | undefined;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const enrolledCourses = courses.filter((c) => progress[c.id]?.enrolled);
  const completedCount = enrolledCourses.filter(
    (c) => getCourseStatus(c, progress[c.id]) === 'verified',
  ).length;
  const percent =
    enrolledCourses.length === 0 ? 0 : Math.round((completedCount / enrolledCourses.length) * 100);
  const pathway = enrolledCourses[0]?.category ?? null;
  const isActive = enrolledCourses.some((c) => {
    const p = progress[c.id]!;
    return p.completedLessonIds.length > 0 || p.quizAttempt || p.evidence;
  });
  const activeWioaCase = wioaCases.find((c) => !c.closedAt) ?? wioaCases[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="crumbrow">
        <Link href="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span className="sep">/</span>
        <Link href="/admin/learners" style={{ color: 'inherit', textDecoration: 'none' }}>
          Learners
        </Link>
        <span className="sep">/</span>
        <span>{learner.name}</span>
        <span className="sep">/</span>
        <span className="cur">Profile details</span>
      </div>

      <ProfileHeader
        left={
          <>
            <CompletionRing percentage={percent} initials={getInitials(learner.name)} />
            <div style={{ minWidth: 0 }}>
              <h1 className="phdr-name">{learner.name}</h1>
              <p className="phdr-sub">
                {learner.email}
                {pathway ? ` · ${pathway}` : ''}
              </p>
              <div className="pbadges">
                <span className="pbadge amber">{percent}% Complete</span>
                <span className={fundingBadge[fundingStatus].className}>
                  {fundingStatus === 'funded' && <Icon name="check" className="h-2.5 w-2.5" />}
                  {fundingBadge[fundingStatus].label}
                </span>
                {cohortName && <span className="pbadge">{cohortName}</span>}
                {isActive && <span className="pbadge">Active</span>}
                <span className="pbadge">Joined {formatMonthYear(learner.createdAt)}</span>
              </div>
            </div>
          </>
        }
        actions={
          <>
            {/* No Messaging UI, no admin-initiated learner-edit flow exists yet — disabled
                rather than fabricated, same honest-disclosure pattern as the Dashboard's
                "Add Learner" button. */}
            <button type="button" className="btn-secondary btn-sm" disabled title="Not yet built">
              <Icon name="mail" className="h-3.5 w-3.5" />
              Message
            </button>
            <button type="button" className="btn-primary btn-sm" disabled title="Not yet built">
              <Icon name="edit" className="h-3.5 w-3.5" />
              Edit learner
            </button>
            <button
              type="button"
              className="iconbtn-sm"
              aria-label="More profile actions"
              disabled
              title="Not yet built"
            >
              •••
            </button>
          </>
        }
      />

      <ProfileTabs
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'personal', label: 'Personal' },
          { key: 'enrollment', label: 'Enrollment' },
          { key: 'funding', label: 'Funding' },
          { key: 'evidence', label: 'Evidence' },
          { key: 'documents', label: 'Documents' },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {tab === 'overview' && (
        <OverviewTab
          enrolledCourses={enrolledCourses}
          currentCourse={currentCourse}
          progress={progress}
          pathway={pathway}
          cohortName={cohortName}
          fundingStatus={fundingStatus}
          activeWioaCase={activeWioaCase}
          isActive={isActive}
        />
      )}

      {tab === 'personal' && <PersonalTab learnerProfile={learnerProfile} />}

      {tab === 'enrollment' && (
        <EnrollmentTab
          learner={learner}
          courses={courses}
          progress={progress}
          courseUnlocks={courseUnlocks ?? {}}
          criteriaCounts={criteriaCounts}
          pathway={pathway}
          cohortId={cohortId}
          cohorts={cohorts}
          currentCourse={currentCourse}
          percent={percent}
          completedCount={completedCount}
          enrolledCourses={enrolledCourses}
          activeWioaCase={activeWioaCase}
        />
      )}

      {tab === 'funding' && <FundingTab />}

      {tab === 'evidence' && (
        <EvidenceTab currentCourse={currentCourse} review={currentCourseCriteriaReview} />
      )}

      {tab === 'documents' && (
        <DocumentsTab
          learner={learner}
          enrolledCourses={enrolledCourses}
          progress={progress}
          credentials={credentials}
          activeWioaCase={activeWioaCase}
        />
      )}
    </div>
  );
}

function OverviewTab({
  enrolledCourses,
  currentCourse,
  progress,
  pathway,
  cohortName,
  fundingStatus,
  activeWioaCase,
  isActive,
}: {
  enrolledCourses: AdminCourse[];
  currentCourse: AdminCourse | null;
  progress: Record<string, CourseProgress>;
  pathway: string | null;
  cohortName: string | null;
  fundingStatus: LearnerFundingStatus;
  activeWioaCase: WioaCaseRecord | null;
  isActive: boolean;
}) {
  const startDate = enrolledCourses[0] ? progress[enrolledCourses[0].id]?.enrolledAt : null;
  const nextLessonCourse = currentCourse;

  let lastActivityAt: number | null = null;
  for (const c of enrolledCourses) {
    const p = progress[c.id]!;
    const candidates = [
      new Date(p.enrolledAt).getTime(),
      p.evidence ? new Date(p.evidence.submittedAt).getTime() : 0,
      p.evidence?.statusUpdatedAt ? new Date(p.evidence.statusUpdatedAt).getTime() : 0,
      p.quizAttempt ? new Date(p.quizAttempt.submittedAt).getTime() : 0,
    ];
    const at = Math.max(...candidates);
    if (!lastActivityAt || at > lastActivityAt) lastActivityAt = at;
  }

  return (
    <div className="ov-grid" style={{ paddingTop: 18 }}>
      <div>
        <div className="ov-h">Program details</div>
        <div className="ov-detgrid" style={{ marginBottom: 20 }}>
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Enrollment status</span>
              <span className="ov-val">
                {enrolledCourses.length > 0 ? 'Active' : 'Not enrolled'}
              </span>
            </div>
            <div className="ov-field">
              <span className="ov-sub">Current course</span>
              <span className="ov-val">{currentCourse?.title ?? '—'}</span>
            </div>
          </div>
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Pathway</span>
              <span className="ov-val">{pathway ?? '—'}</span>
            </div>
            <div className="ov-field">
              <span className="ov-sub">Cohort</span>
              <span className="ov-val">{cohortName ?? 'No cohort'}</span>
            </div>
          </div>
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Funding status</span>
              <span className="ov-val">
                {fundingStatusLabel[fundingStatus](activeWioaCase?.boardName)}
              </span>
            </div>
            <div className="ov-field">
              <span className="ov-sub">Start date</span>
              <span className="ov-val">{startDate ? formatDate(startDate) : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ov-sep" />

      <div>
        <div className="ov-h" style={{ fontSize: 13.5 }}>
          Record status
        </div>
        <div className="side-row" style={{ paddingTop: 0 }}>
          <Icon name={isActive ? 'check' : 'user'} className="side-ic" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
              {isActive ? 'Active learner' : 'Not yet active'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
              {fundingStatus === 'funded'
                ? 'Funded, access active'
                : fundingBadge[fundingStatus].label}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '14px 0' }} />

        <div className="ov-h" style={{ fontSize: 13.5 }}>
          Upcoming
        </div>
        {nextLessonCourse ? (
          <div className="side-row">
            <Icon name="book" className="side-ic" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                Continuing {nextLessonCourse.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                {progress[nextLessonCourse.id]?.completedLessonIds.length ?? 0} of{' '}
                {courseLessonCount(nextLessonCourse)} lessons complete
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No course in progress.</p>
        )}

        <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '14px 0' }} />

        <div className="ov-h" style={{ fontSize: 13.5 }}>
          Last activity
        </div>
        <div className="side-row">
          <Icon name="clock" className="side-ic" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
              {lastActivityAt ? formatDate(new Date(lastActivityAt)) : 'No activity yet'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalTab({ learnerProfile }: { learnerProfile: LearnerProfile | null }) {
  return (
    <div style={{ paddingTop: 18, maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className="ov-h" style={{ margin: 0 }}>
          Personal information
        </div>
        <span className="pbadge">
          <Icon name="lock" className="h-2.5 w-2.5" style={{ marginRight: 3 }} />
          Private
        </span>
      </div>
      {/* The intake process only collects date of birth, phone and address — no field for legal
          name, pronouns, personal email or an emergency contact exists anywhere in the schema.
          Showing "Not collected" rather than inventing values, same honest-disclosure pattern as
          the mentor panel elsewhere. */}
      <div className="ov-detgrid" style={{ marginBottom: 20 }}>
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Date of birth</span>
            <span className="ov-val">
              {learnerProfile?.dateOfBirth
                ? formatDate(learnerProfile.dateOfBirth)
                : 'Not collected'}
            </span>
          </div>
          <div className="ov-field">
            <span className="ov-sub">Legal name</span>
            <span className="ov-val" style={{ color: 'var(--ink-faint)' }}>
              Not collected
            </span>
          </div>
        </div>
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Phone</span>
            <span className="ov-val">{learnerProfile?.mobilePhone ?? 'Not collected'}</span>
          </div>
          <div className="ov-field">
            <span className="ov-sub">Personal email</span>
            <span className="ov-val" style={{ color: 'var(--ink-faint)' }}>
              Not collected
            </span>
          </div>
        </div>
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Pronouns</span>
            <span className="ov-val" style={{ color: 'var(--ink-faint)' }}>
              Not collected
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '0 0 20px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className="ov-h" style={{ margin: 0 }}>
          Address and emergency contact
        </div>
        <span className="pbadge">
          <Icon name="lock" className="h-2.5 w-2.5" style={{ marginRight: 3 }} />
          Private
        </span>
      </div>
      <div className="ov-detgrid">
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Home address</span>
            <span className="ov-val">
              {learnerProfile?.streetAddress
                ? `${learnerProfile.streetAddress}, ${learnerProfile.city ?? ''} ${learnerProfile.state ?? ''}`.trim()
                : 'Not collected'}
            </span>
          </div>
        </div>
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Emergency contact</span>
            <span className="ov-val" style={{ color: 'var(--ink-faint)' }}>
              Not collected
            </span>
          </div>
        </div>
      </div>
      {!learnerProfile && (
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 14 }}>
          This learner hasn&apos;t started the WIOA funding intake, which is the only process that
          collects date of birth, phone, or address today.
        </p>
      )}
    </div>
  );
}

function EnrollmentTab({
  learner,
  courses,
  progress,
  courseUnlocks,
  criteriaCounts,
  pathway,
  cohortId,
  cohorts,
  currentCourse,
  percent,
  completedCount,
  enrolledCourses,
  activeWioaCase,
}: {
  learner: LearnerRecord;
  courses: AdminCourse[];
  progress: Record<string, CourseProgress>;
  courseUnlocks: Record<string, CourseUnlockRecord>;
  criteriaCounts: Record<string, number>;
  pathway: string | null;
  cohortId: string | null;
  cohorts: CohortOption[];
  currentCourse: AdminCourse | null;
  percent: number;
  completedCount: number;
  enrolledCourses: AdminCourse[];
  activeWioaCase: WioaCaseRecord | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const restrictedCourses = courses.filter((c) => c.access === 'restricted');

  function updateStatus(courseId: string, status: 'approved' | 'rejected') {
    startTransition(async () => {
      try {
        await setEvidenceStatus(learner.id, courseId, status);
        toast.success(status === 'approved' ? 'Evidence approved' : 'Evidence rejected');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update evidence status.');
      }
    });
  }

  function changeCohort(newCohortId: string) {
    startTransition(async () => {
      try {
        await setLearnerCohort(learner.id, newCohortId || null);
        toast.success(newCohortId ? 'Cohort updated' : 'Removed from cohort');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update cohort.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4" style={{ paddingTop: 18 }}>
      <div>
        <div className="ov-h">Pathway &amp; cohort</div>
        <div className="ov-detgrid" style={{ marginBottom: 20 }}>
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Pathway</span>
              <span className="ov-val">{pathway ?? '—'}</span>
            </div>
            <div className="ov-field">
              <span className="ov-sub">Cohort</span>
              <select
                className="ov-select"
                value={cohortId ?? ''}
                onChange={(e) => changeCohort(e.target.value)}
                aria-label="Assign learner to cohort"
              >
                <option value="">No cohort</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Current course</span>
              <span className="ov-val">{currentCourse?.title ?? '—'}</span>
            </div>
          </div>
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Courses completed</span>
              <span className="ov-val">
                {completedCount} of {enrolledCourses.length}
              </span>
            </div>
            <div className="ov-field">
              <span className="ov-sub">Overall progress</span>
              <span className="ov-val">{percent}%</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '0 0 20px' }} />

        <div className="ov-h">Enrollment details</div>
        <div className="ov-detgrid">
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Enrollment status</span>
              <span className="ov-val">
                {enrolledCourses.length > 0 ? 'Active' : 'Not enrolled'}
              </span>
            </div>
          </div>
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Start date</span>
              <span className="ov-val">
                {enrolledCourses[0] ? formatDate(progress[enrolledCourses[0].id]?.enrolledAt) : '—'}
              </span>
            </div>
          </div>
          <div className="ov-detcol">
            <div className="ov-field">
              <span className="ov-sub">Enrollment source</span>
              <span className="ov-val">
                {activeWioaCase
                  ? `WIOA-funded${activeWioaCase.boardName ? ` (${activeWioaCase.boardName})` : ''}`
                  : 'Self-pay'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '2px 0 4px' }} />
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>Enrolled courses</div>

      {enrolledCourses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {learner.name} isn&apos;t enrolled in any courses yet.
          </CardContent>
        </Card>
      ) : (
        enrolledCourses.map((course) => {
          const courseProgress = progress[course.id];
          const total = courseLessonCount(course);
          const done = courseProgress?.completedLessonIds.length ?? 0;
          const coursePercent = total === 0 ? 0 : Math.min(100, Math.max(0, (done / total) * 100));
          const status = getCourseStatus(course, courseProgress);
          const evidence = courseProgress?.evidence;

          return (
            <Card key={course.id}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {course.category}
                    </p>
                    <h3 className="text-base font-semibold text-foreground">{course.title}</h3>
                  </div>
                  <AdminBadge variant={toneToBadgeVariant[courseStatusTone[status]]}>
                    {courseStatusLabel[status]}
                  </AdminBadge>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {done} of {total} lessons
                    </span>
                    <span className="font-medium text-foreground">
                      {Math.round(coursePercent)}%
                    </span>
                  </div>
                  <Progress value={coursePercent} />
                </div>

                {courseProgress?.quizAttempt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clipboard className="size-4" />
                    Knowledge Assessment: {courseProgress.quizAttempt.scorePercent}%
                    {courseProgress.quizAttempt.passed ? ' (passed)' : ' (not passed)'}
                  </div>
                )}

                {evidence && (
                  <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">Practical Evidence</p>
                      <span className="text-xs text-muted-foreground">
                        Submitted{' '}
                        {new Date(evidence.submittedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {evidence.isPerCriterion ? (
                      <p className="text-sm text-muted-foreground">
                        Submitted per criterion — open the per-criterion review below to see each
                        photo and note.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{evidence.description}</p>
                    )}
                    {evidence.hasSubmissionFile && (
                      <button
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            const url = await getEvidenceFileUrl(evidence.id);
                            window.open(url, '_blank', 'noopener,noreferrer');
                          });
                        }}
                        className="flex w-fit items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Paperclip className="size-4 shrink-0 text-primary" />
                        {evidence.fileName ?? 'View attachment'}
                      </button>
                    )}

                    {(criteriaCounts[course.id] ?? 0) > 0 ? (
                      <div className="pt-1">
                        <AdminButton size="sm" asChild>
                          <Link href={`/admin/learners/${learner.id}/review/${course.id}`}>
                            Review criteria →
                          </Link>
                        </AdminButton>
                      </div>
                    ) : evidence.status === 'pending' ? (
                      <div className="flex gap-2 pt-1">
                        <AdminButton size="sm" onClick={() => updateStatus(course.id, 'approved')}>
                          <Check className="size-4" />
                          Approve
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(course.id, 'rejected')}
                        >
                          <X className="size-4" />
                          Reject
                        </AdminButton>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <AdminButton
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateStatus(
                              course.id,
                              evidence.status === 'approved' ? 'rejected' : 'approved',
                            )
                          }
                        >
                          Change to {evidence.status === 'approved' ? 'Rejected' : 'Approved'}
                        </AdminButton>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {restrictedCourses.length > 0 && (
        <CourseAccessCard
          learnerId={learner.id}
          restrictedCourses={restrictedCourses}
          courseUnlocks={courseUnlocks}
        />
      )}
    </div>
  );
}

function FundingTab() {
  return (
    <div style={{ paddingTop: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <Icon
        name="lock"
        className="h-4 w-4"
        style={{ flexShrink: 0, marginTop: 2, color: 'var(--ink-muted)' }}
      />
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Restricted information</p>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '4px 0 0', maxWidth: 520 }}>
          Visible to the WIOA Coordinator and authorized finance roles. Admin sees funding status
          only — see the Overview tab&apos;s Program details — not case amounts, award letters or
          coordinator notes.
        </p>
      </div>
    </div>
  );
}

function EvidenceTab({
  currentCourse,
  review,
}: {
  currentCourse: AdminCourse | null;
  review: CriterionReviewData | undefined;
}) {
  if (!currentCourse) {
    return (
      <p style={{ paddingTop: 18, fontSize: 13.5, color: 'var(--ink-muted)' }}>
        No current course to show evidence for.
      </p>
    );
  }

  if (!review) {
    return (
      <p style={{ paddingTop: 18, fontSize: 13.5, color: 'var(--ink-muted)' }}>
        {currentCourse.title} has no per-criterion evidence submitted yet — see the Enrollment tab
        for its legacy evidence status, if any.
      </p>
    );
  }

  const required = review.criteria.length;
  const met = review.criteria.filter((c) => c.met === true).length;
  const notYetSubmitted = review.criteria.filter((c) => !c.criterionAssessmentId).length;
  const awaitingReview = review.criteria.filter(
    (c) => c.criterionAssessmentId && c.met === null,
  ).length;
  const notMet = review.criteria.filter((c) => c.met === false);
  const pendingCriterion = review.criteria.find((c) => c.criterionAssessmentId && c.met === null);

  return (
    <div style={{ paddingTop: 18 }}>
      <div className="ov-h">Criteria progress — {currentCourse.title}</div>
      <div className="ov-detgrid" style={{ marginBottom: 20 }}>
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Required criteria</span>
            <span className="ov-val">{required}</span>
          </div>
          <div className="ov-field">
            <span className="ov-sub">Not yet submitted</span>
            <span className="ov-val">{notYetSubmitted}</span>
          </div>
        </div>
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Criteria met</span>
            <span className="ov-val">{met}</span>
          </div>
          <div className="ov-field">
            <span className="ov-sub">Needs resubmission</span>
            <span className="ov-val">{notMet.length}</span>
          </div>
        </div>
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Awaiting review</span>
            <span className="ov-val">{awaitingReview}</span>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--nfcap-border)', margin: '0 0 20px' }} />

      <div className="ov-h">Review activity</div>
      <div className="ov-detgrid">
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Submitted</span>
            <span className="ov-val">{formatDate(review.submittedAt)}</span>
          </div>
        </div>
        <div className="ov-detcol">
          <div className="ov-field">
            <span className="ov-sub">Pending item</span>
            <span className="ov-val">{pendingCriterion?.title ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({
  enrolledCourses,
  progress,
  credentials,
  activeWioaCase,
}: {
  learner: LearnerRecord;
  enrolledCourses: AdminCourse[];
  progress: Record<string, CourseProgress>;
  credentials: Credential[];
  activeWioaCase: WioaCaseRecord | null;
}) {
  const [, startTransition] = useTransition();
  const credentialByCourseId = new Map(credentials.map((c) => [c.course.id, c]));

  type Row = {
    key: string;
    name: string;
    category: string;
    updated: string;
    status: string;
    restricted?: boolean;
    download?: () => void;
  };

  const rows: Row[] = [];

  for (const course of enrolledCourses) {
    const credential = credentialByCourseId.get(course.id);
    if (credential) {
      rows.push({
        key: `cert-${course.id}`,
        name: `${course.title} Certificate`,
        category: 'Credential',
        updated: formatDate(credential.issuedAt),
        status: 'Issued',
      });
      continue;
    }
    const evidence = progress[course.id]?.evidence;
    if (evidence) {
      rows.push({
        key: `evidence-${course.id}`,
        name: evidence.fileName ?? `${course.title} evidence`,
        category: 'Practical evidence',
        updated: formatDate(evidence.statusUpdatedAt ?? evidence.submittedAt),
        status:
          evidence.status === 'approved'
            ? 'Approved'
            : evidence.status === 'rejected'
              ? 'Rejected'
              : 'In review',
        download: evidence.hasSubmissionFile
          ? () =>
              startTransition(async () => {
                const url = await getEvidenceFileUrl(evidence.id);
                window.open(url, '_blank', 'noopener,noreferrer');
              })
          : undefined,
      });
    }
  }

  if (activeWioaCase) {
    const anyAccepted = activeWioaCase.documents.some((d) => d.status === 'ACCEPTED');
    rows.push({
      key: `wioa-${activeWioaCase.id}`,
      name: 'WIOA eligibility documents',
      category: 'Funding intake',
      updated: formatDate(activeWioaCase.createdAt),
      status: anyAccepted ? 'On file' : 'Pending',
      restricted: true,
    });
  }

  return (
    <div style={{ paddingTop: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div className="ov-h" style={{ margin: 0 }}>
          Documents
        </div>
        {/* No admin document-upload-for-learner flow exists yet — disabled rather than
            fabricated. */}
        <button type="button" className="btn-primary btn-sm" disabled title="Not yet built">
          <Icon name="file-text" className="h-3.5 w-3.5" />
          Add document
        </button>
      </div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13.5, color: 'var(--ink-muted)' }}>No documents on file yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Category</th>
              <th>Updated</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td style={{ fontWeight: 600 }}>{row.name}</td>
                <td style={{ color: 'var(--ink-muted)' }}>{row.category}</td>
                <td style={{ color: 'var(--ink-muted)' }}>{row.updated}</td>
                <td>
                  <span className="pbadge">{row.status}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {row.restricted ? (
                    <span
                      style={{
                        fontSize: 11.5,
                        color: 'var(--ink-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Icon name="lock" className="h-3 w-3" />
                      Restricted
                    </span>
                  ) : (
                    <RowActionsMenu label={`Actions for ${row.name}`}>
                      {row.download ? (
                        <DropdownMenuItem onSelect={row.download}>
                          <Icon name="download" className="h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem disabled>No file on record</DropdownMenuItem>
                      )}
                    </RowActionsMenu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CourseAccessCard({
  learnerId,
  restrictedCourses,
  courseUnlocks,
}: {
  learnerId: string;
  restrictedCourses: AdminCourse[];
  courseUnlocks: Record<string, CourseUnlockRecord>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [grantingId, setGrantingId] = useState<string | null>(null);

  // `course.id` below IS the course's slug (AdminCourse.id — src/lib/data/courses.ts's
  // mapCourse), so this param name matches grantCourseUnlock's, not a mismatch.
  function grant(courseSlug: string) {
    setGrantingId(courseSlug);
    startTransition(async () => {
      try {
        await grantCourseUnlock(learnerId, courseSlug);
        toast.success('Course access granted');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not grant course access.');
      } finally {
        setGrantingId(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course access</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {restrictedCourses.map((course) => {
          const unlock = courseUnlocks[course.id];
          return (
            <div
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{course.title}</p>
                {unlock && (
                  <p className="text-xs text-muted-foreground">
                    Unlocked via{' '}
                    {unlock.source === 'WIOA_FUNDING' ? 'WIOA funding' : 'Admin assignment'}
                  </p>
                )}
              </div>
              {unlock ? (
                <Badge tone="success">Unlocked</Badge>
              ) : (
                <AdminButton
                  size="sm"
                  variant="outline"
                  disabled={pending && grantingId === course.id}
                  onClick={() => grant(course.id)}
                >
                  {pending && grantingId === course.id ? 'Granting…' : 'Grant access'}
                </AdminButton>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
