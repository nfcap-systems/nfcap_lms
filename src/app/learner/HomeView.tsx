'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Badge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { LockedCourseDialog, LOCKED_COURSE_COPY } from '@/components/learner/LockedCourseDialog';
import { markAnnouncementRead } from '@/lib/actions/announcements';
import { courseLessonCount, courseDurationMinutes, flattenLessons } from '@/lib/types';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import type { Credential } from '@/lib/data/credentials';
import type { WioaCaseRecord } from '@/lib/data/wioa';
import type { Announcement } from '@/lib/data/announcements';
import { WIOA_STATUS_LABEL } from '@/lib/wioa/status';

// Only 3 real trade photos exist for this retrofit (pulled from the design canvas); cycle
// through them for module cards rather than inventing per-course imagery.
const MODULE_PHOTOS = [
  '/images/learner/safety-tools.jpg',
  '/images/learner/flooring-fundamentals.jpg',
  '/images/learner/tile-installation.jpg',
];

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeView({
  allCourses,
  pathway,
  progressMap,
  unlockedCourseSlugs,
  credentials,
  wioaCases,
  announcements,
  firstName,
}: {
  allCourses: AdminCourse[];
  pathway: AdminCourse[];
  progressMap: Record<string, CourseProgress>;
  unlockedCourseSlugs: string[];
  credentials: Credential[];
  wioaCases: WioaCaseRecord[];
  announcements: Announcement[];
  firstName: string;
}) {
  const router = useRouter();
  const [lockedCourse, setLockedCourse] = useState<AdminCourse | null>(null);

  const enrolledCourses = allCourses
    .filter((c) => progressMap[c.id]?.enrolled)
    .sort((a, b) => a.pathwayOrder - b.pathwayOrder);

  // Every enrolled course's next incomplete lesson, in pathway order — the first becomes the
  // Continue-Learning hero, the second (if any) the "Up next" row below it.
  const upcomingItems = enrolledCourses
    .map((course) => {
      const flat = flattenLessons(course);
      const completedLessonIds = progressMap[course.id]?.completedLessonIds ?? [];
      const nextLesson = flat.find((f) => !completedLessonIds.includes(f.lesson.id));
      return nextLesson
        ? { course, nextLesson, remaining: flat.length - completedLessonIds.length }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const nextUp = upcomingItems[0] ?? null;
  const upNext = upcomingItems[1] ?? null;

  const completedModules = pathway.filter((c) => !!progressMap[c.id]?.certificateId).length;
  const pathwayPercent =
    pathway.length > 0 ? Math.round((completedModules / pathway.length) * 100) : 0;
  const quizScores = enrolledCourses
    .map((c) => progressMap[c.id]?.quizAttempt?.scorePercent)
    .filter((v): v is number => typeof v === 'number');
  const avgQuizScore =
    quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : null;

  // "Needs a practical evidence submission": finished every lesson and passed the quiz, but
  // hasn't submitted evidence yet, or a prior submission was rejected.
  const evidenceTaskCourse = enrolledCourses.find((course) => {
    const progress = progressMap[course.id];
    if (!progress) return false;
    if (progress.evidence?.status === 'rejected') return true;
    const total = courseLessonCount(course);
    const allLessonsDone = total > 0 && progress.completedLessonIds.length === total;
    return allLessonsDone && progress.quizAttempt?.passed && !progress.evidence;
  });

  // Pending-review queue (board's "To be reviewed" panel) — real pending EvidenceSubmissions
  // only. There is no "pending quiz review" concept in the schema (quizzes are auto-graded), so
  // unlike the board's own example row, that item type is left out rather than invented.
  const reviewItems = enrolledCourses.filter(
    (course) => progressMap[course.id]?.evidence?.status === 'pending',
  );

  // Course Catalog discovery shelf — published courses this learner isn't enrolled in yet.
  const discoveryCourses = pathway.filter((c) => !progressMap[c.id]?.enrolled).slice(0, 3);

  // Portfolio-evidence preview (board shows individual Met evidence pieces, not certificates) —
  // flatten each credential's per-criterion captures; legacy (pre-per-criterion) credentials fall
  // back to their one description, same pattern PortfolioView already uses.
  const evidencePieces = credentials
    .flatMap((credential) =>
      credential.criteria.length > 0
        ? credential.criteria.map((criterion) => ({
            key: criterion.criterionAssessmentId,
            title: criterion.title,
            courseTitle: credential.course.title,
          }))
        : [
            {
              key: credential.certificateId,
              title: credential.evidence.description,
              courseTitle: credential.course.title,
            },
          ],
    )
    .slice(-3)
    .reverse();

  const sidebarCertificates = credentials.slice(-3).reverse();

  const latestWioaCase = wioaCases[0] ?? null;
  const [banner] = announcements;

  useEffect(() => {
    if (banner) void markAnnouncementRead(banner.id);
  }, [banner]);

  return (
    <div className="flex flex-col gap-6">
      <div className="greet-row">
        <div>
          <p className="greet-h1">
            {timeOfDayGreeting()}, {firstName}
          </p>
          <p className="greet-sub">
            Welcome back — keep going on your {pathway[0]?.category ?? 'training'}.
          </p>
        </div>
        <div className="stat-row">
          <div className="stat-tile">
            <span className="ic">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <div>
              <div className="n">
                {completedModules} / {pathway.length}
              </div>
              <div className="l">Modules completed</div>
            </div>
          </div>
          <div className="stat-tile">
            <span className="ic">
              <Icon name="award" className="h-4 w-4" />
            </span>
            <div>
              <div className="n">{credentials.length}</div>
              <div className="l">Certificates earned</div>
            </div>
          </div>
          <div className="stat-tile">
            <span className="ic">
              <Icon name="bar-chart" className="h-4 w-4" />
            </span>
            <div>
              <div className="n">{avgQuizScore !== null ? `${avgQuizScore}%` : '—'}</div>
              <div className="l">Avg. quiz score</div>
            </div>
          </div>
        </div>
      </div>

      {banner && (
        <div className="announce-banner">
          <span className="announce-badge">New</span>
          <span className="announce-title">{banner.title}</span>
          <p className="announce-desc">{banner.body}</p>
        </div>
      )}

      <div className="body-grid">
        <div>
          {nextUp && (
            <>
              <div className="sec-head">
                <div className="left">
                  <Icon name="play" className="h-3.5 w-3.5" />
                  <span>Continue</span>
                </div>
                <Link href="/learner/my-learning">View all</Link>
              </div>
              <div className="lrn-hero">
                <div className="lrn-hero-media">
                  <Image
                    src="/images/learner/tile-installation.jpg"
                    alt=""
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                  <span className="lrn-hero-play">
                    <Icon name="play" className="h-4 w-4" />
                  </span>
                  <span className="lrn-hero-duration">
                    <Icon name="clock" className="h-3 w-3" />
                    {nextUp.nextLesson.lesson.durationMinutes} min
                  </span>
                </div>
                <div className="lrn-hero-body">
                  <span className="lrn-hero-pill">In Progress</span>
                  <div className="lrn-hero-title">{nextUp.course.title}</div>
                  <div className="lrn-hero-desc">Next up: {nextUp.nextLesson.lesson.title}</div>
                  <div className="lrn-hero-progress">
                    <div className="bar">
                      <div
                        className="fill"
                        style={{
                          width: `${Math.round(((progressMap[nextUp.course.id]?.completedLessonIds.length ?? 0) / courseLessonCount(nextUp.course)) * 100)}%`,
                        }}
                      />
                    </div>
                    <b>
                      {Math.round(
                        ((progressMap[nextUp.course.id]?.completedLessonIds.length ?? 0) /
                          courseLessonCount(nextUp.course)) *
                          100,
                      )}
                      %
                    </b>
                  </div>
                  <div className="lrn-hero-actions">
                    <Button
                      size="lg"
                      onClick={() => router.push(`/learner/courses/${nextUp.course.id}`)}
                    >
                      Continue Lesson
                      <Icon name="arrow-right" className="h-4 w-4" />
                    </Button>
                    <button
                      type="button"
                      disabled
                      className="lrn-hero-bookmark"
                      aria-label="Bookmark lesson"
                    >
                      <Icon name="file-text" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {upNext && (
                <>
                  <p className="lrn-upnext-label">Up next</p>
                  <div className="continue-list">
                    <div className="continue-row">
                      <Image
                        src={MODULE_PHOTOS[0]}
                        alt=""
                        width={52}
                        height={38}
                        className="continue-thumb"
                      />
                      <div>
                        <div className="continue-tag">
                          <span className="ic">
                            <Icon name="book" className="h-2.5 w-2.5" />
                          </span>
                          Course
                        </div>
                        <p className="continue-lesson">{upNext.nextLesson.lesson.title}</p>
                      </div>
                      <div className="continue-cell">
                        <span className="lbl">Content</span>
                        <span className="val">{upNext.remaining} lessons</span>
                      </div>
                      <div className="continue-cell">
                        <span className="lbl">Completion</span>
                        <span className="val">not started</span>
                      </div>
                      <button
                        type="button"
                        className="continue-btn"
                        onClick={() => router.push(`/learner/courses/${upNext.course.id}`)}
                      >
                        Start
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {!nextUp && (
            <div
              style={{
                borderRadius: 'var(--nfcap-radius-lg)',
                background: 'var(--surface-muted)',
                border: '1px solid var(--nfcap-border)',
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 28,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 19,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--ink)',
                }}
              >
                {enrolledCourses.length > 0
                  ? "You've completed every enrolled course."
                  : "You're not enrolled in any training yet."}
              </h2>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-muted)' }}>
                Browse the Course Catalog to keep going.
              </p>
              <Button
                onClick={() => router.push('/learner/explore')}
                style={{ width: 'fit-content' }}
              >
                Browse Course Catalog
              </Button>
            </div>
          )}

          {discoveryCourses.length > 0 && (
            <>
              <div className="sec-head">
                <div className="left">
                  <Icon name="compass" className="h-3.5 w-3.5" />
                  <span>Course Catalog</span>
                </div>
                <Link href="/learner/explore">View all</Link>
              </div>
              <div className="catalog-grid">
                {discoveryCourses.map((course, index) => {
                  const unlocked = unlockedCourseSlugs.includes(course.id);
                  const canSelfEnroll = course.access === 'open' || unlocked;
                  const hours = Math.round((courseDurationMinutes(course) / 60) * 10) / 10;
                  return (
                    <div className="catalog-card" key={course.id}>
                      <div className="catalog-thumb-wrap">
                        <Image
                          src={MODULE_PHOTOS[index % MODULE_PHOTOS.length]}
                          alt=""
                          width={400}
                          height={128}
                        />
                        <span className="catalog-lvl">{courseLessonCount(course)} lessons</span>
                      </div>
                      <div className="catalog-body">
                        <div className="catalog-tag">
                          <span className="ic">
                            <Icon name="book" className="h-2.5 w-2.5" />
                          </span>
                          Course
                        </div>
                        <div className="catalog-title">{course.title}</div>
                        <div className="catalog-pills">
                          <span className="catalog-pill">{hours}h</span>
                        </div>
                        <div className="catalog-foot">
                          <span className="catalog-status">Not Started</span>
                          {canSelfEnroll ? (
                            <button
                              type="button"
                              className="catalog-enroll"
                              onClick={() => router.push(`/learner/courses/${course.id}`)}
                            >
                              Enroll
                            </button>
                          ) : (
                            <button type="button" className="catalog-enroll" disabled>
                              Assigned by NFCAP
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="lrn-pathway-head">
            <h2>Your pathway — {pathway[0]?.category ?? 'Apprenticeship'}</h2>
            <span>
              {completedModules} of {pathway.length} complete
            </span>
          </div>
          <div className="lrn-pathway-bar">
            <div className="fill" style={{ width: `${pathwayPercent}%` }} />
          </div>
          <div
            className="pathway-strip"
            style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 92px' }}
          >
            {pathway.slice(0, 3).map((course, index) => {
              const progress = progressMap[course.id];
              const locked =
                !progress?.enrolled &&
                course.access === 'restricted' &&
                !unlockedCourseSlugs.includes(course.id);
              const status = getCourseStatus(course, progress);

              if (locked) {
                return (
                  <button
                    key={course.id}
                    type="button"
                    className="lrn-mcard"
                    style={{ opacity: 0.65 }}
                    onClick={() => setLockedCourse(course)}
                  >
                    <div
                      className="thumb"
                      style={{
                        background: 'var(--nfcap-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink-faint)',
                      }}
                    >
                      <Icon name="lock" className="h-6 w-6" />
                    </div>
                    <div className="lrn-mcard-body">
                      <div className="t">{course.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {LOCKED_COURSE_COPY}
                      </div>
                      <Badge tone="neutral" style={{ width: 'fit-content' }}>
                        <Icon name="lock" className="h-3 w-3" />
                        Locked
                      </Badge>
                    </div>
                  </button>
                );
              }

              const isActive = course.id === nextUp?.course.id;
              const coursePercent = isActive
                ? Math.round(
                    ((progress?.completedLessonIds.length ?? 0) / courseLessonCount(course)) * 100,
                  )
                : 0;

              return (
                <button
                  key={course.id}
                  type="button"
                  className="lrn-mcard"
                  onClick={() => router.push(`/learner/courses/${course.id}`)}
                >
                  {isActive ? (
                    <div
                      className="thumb"
                      style={{
                        background: 'var(--surface-muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: 10,
                      }}
                    >
                      <Badge tone="success" style={{ width: 'fit-content' }}>
                        ● Active
                      </Badge>
                      <div className="lrn-pathway-bar" style={{ width: '100%' }}>
                        <div className="fill" style={{ width: `${coursePercent}%` }} />
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={MODULE_PHOTOS[index % MODULE_PHOTOS.length]}
                      alt=""
                      width={300}
                      height={108}
                      className="thumb"
                    />
                  )}
                  <div className="lrn-mcard-body">
                    <div className="t">{course.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      Module {index + 1} · {courseLessonCount(course)} lessons
                    </div>
                    <Badge tone={courseStatusTone[status]} style={{ width: 'fit-content' }}>
                      {courseStatusLabel[status]}
                    </Badge>
                  </div>
                </button>
              );
            })}
            <Link href="/learner/my-learning" className="lrn-allcard">
              <Icon name="chevron-right" className="h-4.5 w-4.5" />
              View all
              <br />
              modules
            </Link>
          </div>

          {evidencePieces.length > 0 && (
            <>
              <div className="sec-head" style={{ marginTop: 20 }}>
                <div className="left">
                  <Icon name="briefcase" className="h-3.5 w-3.5" />
                  <span>Portfolio</span>
                </div>
                <Link href="/learner/portfolio">View all</Link>
              </div>
              <div className="lrn-pcard-grid">
                {evidencePieces.map((piece, index) => (
                  <div className="lrn-pcard" key={piece.key}>
                    <Image
                      src={MODULE_PHOTOS[index % MODULE_PHOTOS.length]}
                      alt=""
                      width={44}
                      height={44}
                      className="thumb"
                    />
                    <div className="pcard-body">
                      <div className="t">{piece.title}</div>
                      <div className="chips">
                        <span className="chip">{piece.courseTitle}</span>
                        <span className="chip verified">
                          <Icon name="check" className="h-2.5 w-2.5" />
                          Met
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="status-col">
          {nextUp && (
            <div className="lrn-side-panel">
              <div className="lrn-side-title">
                <h3>Upcoming</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  className="lrn-icon-tile"
                  style={{ background: '#eff6ff', color: 'var(--nfcap-accent)' }}
                >
                  <Icon name="book" className="h-4 w-4" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {nextUp.nextLesson.lesson.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    {nextUp.remaining} lesson{nextUp.remaining === 1 ? '' : 's'} left in this course
                  </div>
                </div>
                <Icon
                  name="chevron-right"
                  className="h-4 w-4"
                  style={{ color: 'var(--ink-faint)', flexShrink: 0 }}
                />
              </div>
            </div>
          )}

          {/* "Your mentor" stays "Not yet assigned" with no action — there is no mentor-assignment
              model anywhere in prisma/schema.prisma yet (docs/build/LRN01_HOME_DRIFT.md point 1).
              The board's real name + "Message mentor" button is blocked on that schema decision,
              not a styling gap — don't fabricate either here. */}
          <div className="lrn-side-panel">
            <div className="lrn-side-title">
              <h3>Your mentor</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--surface-muted)',
                  color: 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="user" className="h-5 w-5" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                  Not yet assigned
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  A mentor will be assigned as you progress.
                </div>
              </div>
            </div>
          </div>

          <div
            className="lrn-side-panel"
            style={{
              background: latestWioaCase
                ? 'linear-gradient(135deg, #f0fdf4, #f7fffb)'
                : 'var(--surface-muted)',
              borderColor: latestWioaCase ? '#bbf7d0' : 'var(--nfcap-border)',
            }}
          >
            <div className="lrn-side-title">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="briefcase" className="h-3.5 w-3.5" />
                Funding status
              </h3>
              {latestWioaCase && (
                <Badge tone="success">{WIOA_STATUS_LABEL[latestWioaCase.status]}</Badge>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              {latestWioaCase
                ? `WIOA funding status for ${latestWioaCase.courseTitle}.`
                : 'No WIOA funding case on file for your account.'}
            </div>
            <Link
              href="/learner/funding"
              style={{
                fontSize: 12.5,
                color: 'var(--nfcap-accent)',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              View funding details
            </Link>
          </div>

          {evidenceTaskCourse && (
            <div
              className="lrn-side-panel"
              style={{
                background: 'linear-gradient(135deg, #fffbeb, #fffdf5)',
                borderColor: '#fde68a',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="lrn-icon-tile" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <Icon name="award" className="h-4 w-4" />
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    color: 'var(--ink)',
                  }}
                >
                  Upcoming task
                </h3>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                Practical evidence submission
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                {evidenceTaskCourse.title} is ready for your evidence submission.
              </div>
              <Link
                href={`/learner/courses/${evidenceTaskCourse.id}`}
                style={{
                  fontSize: 12.5,
                  color: 'var(--nfcap-accent)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  alignSelf: 'flex-start',
                }}
              >
                Start submission
              </Link>
            </div>
          )}

          {reviewItems.length > 0 && (
            <div className="lrn-side-panel">
              <div className="lrn-side-title">
                <h3>To be reviewed</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reviewItems.map((course) => (
                  <div className="lrn-review-row" key={course.id}>
                    <div
                      className="lrn-review-icon"
                      style={{ background: '#eff6ff', color: 'var(--nfcap-accent)' }}
                    >
                      <Icon name="file-text" className="h-3.5 w-3.5" />
                    </div>
                    <div className="lrn-review-body">
                      <div className="lrn-review-title">{course.title} Evidence</div>
                      <div className="lrn-review-meta">Assignment · Pending review</div>
                    </div>
                    <Icon
                      name="chevron-right"
                      className="h-4 w-4"
                      style={{ color: 'var(--ink-faint)', flexShrink: 0 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {sidebarCertificates.length > 0 && (
            <div className="lrn-side-panel">
              <div className="lrn-side-title">
                <h3>Certificates</h3>
                <Link href="/learner/certificates">View all</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sidebarCertificates.map((credential) => (
                  <div className="lrn-review-row" key={credential.certificateId}>
                    <div
                      className="lrn-review-icon"
                      style={{
                        background: 'var(--status-complete-bg)',
                        color: 'var(--status-complete)',
                      }}
                    >
                      <Icon name="award" className="h-3.5 w-3.5" />
                    </div>
                    <div className="lrn-review-body">
                      <div className="lrn-review-title">{credential.course.title}</div>
                      <div className="lrn-review-meta">
                        Earned{' '}
                        {new Date(credential.issuedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                    {/* Downloadable PDF is Phase 4 (CertificatesView.tsx already discloses this),
                        not built yet — disabled rather than a fake download. */}
                    <button
                      type="button"
                      className="lrn-dl-btn"
                      disabled
                      aria-label="Download certificate"
                    >
                      <Icon name="download" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <LockedCourseDialog course={lockedCourse} onClose={() => setLockedCourse(null)} />
    </div>
  );
}
