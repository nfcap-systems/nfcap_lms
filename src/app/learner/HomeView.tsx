'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Badge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { courseLessonCount, flattenLessons } from '@/lib/types';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import type { Credential } from '@/lib/data/credentials';
import type { WioaCaseRecord } from '@/lib/data/wioa';
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
  firstName,
}: {
  allCourses: AdminCourse[];
  pathway: AdminCourse[];
  progressMap: Record<string, CourseProgress>;
  unlockedCourseSlugs: string[];
  credentials: Credential[];
  wioaCases: WioaCaseRecord[];
  firstName: string;
}) {
  const router = useRouter();

  const enrolledCourses = allCourses
    .filter((c) => progressMap[c.id]?.enrolled)
    .sort((a, b) => a.pathwayOrder - b.pathwayOrder);

  const nextUp = enrolledCourses
    .map((course) => {
      const flat = flattenLessons(course);
      const completedLessonIds = progressMap[course.id]?.completedLessonIds ?? [];
      const nextLesson = flat.find((f) => !completedLessonIds.includes(f.lesson.id));
      return nextLesson
        ? { course, nextLesson, remaining: flat.length - completedLessonIds.length }
        : null;
    })
    .find(Boolean);

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

  const latestWioaCase = wioaCases[0] ?? null;

  return (
    <div className="flex flex-col gap-9">
      {/* Hero: greeting + stat strip */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            height: 150,
            borderRadius: 'var(--nfcap-radius-lg)',
            overflow: 'hidden',
            position: 'relative',
            background:
              'linear-gradient(105deg, #eff6ff 0%, #f5f8ff 46%, #dbe9ff 72%, var(--surface) 100%)',
            display: 'flex',
            alignItems: 'center',
            boxShadow: 'var(--nfcap-shadow-sm)',
            border: '1px solid var(--nfcap-border)',
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '0 36px',
              maxWidth: '56%',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 'fit-content',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--nfcap-accent)',
                background: '#dbeafe',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {timeOfDayGreeting()}!
            </span>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--ink)',
                }}
              >
                Welcome back, {firstName}
              </div>
              <div
                style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 5, maxWidth: 420 }}
              >
                Here&apos;s what&apos;s next in your training.
              </div>
            </div>
          </div>
          <Image
            src="/images/learner/tile-installation.jpg"
            alt=""
            width={700}
            height={150}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '46%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              clipPath: 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)',
            }}
          />
        </div>

        <div
          style={{
            position: 'relative',
            margin: '10px 16px 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 14,
            zIndex: 3,
          }}
        >
          <div className="lrn-stat">
            <span
              className="lrn-stat-icon"
              style={{ background: '#eff6ff', color: 'var(--nfcap-accent)' }}
            >
              <Icon name="book" className="h-5 w-5" />
            </span>
            <div className="vals">
              <span className="n">
                {enrolledCourses.length} / {pathway.length}
              </span>
              <span className="l">Courses enrolled</span>
            </div>
          </div>
          <div className="lrn-stat">
            <span className="lrn-stat-icon" style={{ background: '#f0fdf4', color: '#166534' }}>
              <Icon name="award" className="h-5 w-5" />
            </span>
            <div className="vals">
              <span className="n">{credentials.length}</span>
              <span className="l">Certificates earned</span>
            </div>
          </div>
          <div className="lrn-stat">
            <span
              className="lrn-stat-icon"
              style={{ background: '#eff6ff', color: 'var(--nfcap-accent)' }}
            >
              <Icon name="bar-chart" className="h-5 w-5" />
            </span>
            <div className="vals">
              <span className="n">{avgQuizScore !== null ? `${avgQuizScore}%` : '—'}</span>
              <span className="l">Avg. quiz score</span>
            </div>
          </div>
          <div className="lrn-stat">
            <span className="lrn-stat-icon" style={{ background: '#f3eefe', color: '#7c3aed' }}>
              <Icon name="layers" className="h-5 w-5" />
            </span>
            <div className="vals">
              <span className="n">{pathwayPercent}%</span>
              <span className="l">Pathway progress</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          {nextUp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="lrn-sechead">
                <div>
                  <h2>Continue Learning</h2>
                  <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>
                    Pick up where you left off and keep making progress.
                  </div>
                </div>
                <Link href="/learner/my-learning">View all →</Link>
              </div>
              <div
                style={{
                  background: 'linear-gradient(120deg, #eff6ff, var(--surface-muted) 75%)',
                  border: '1px solid #bfdbfe',
                  borderRadius: 'var(--nfcap-radius-lg)',
                  boxShadow: 'var(--nfcap-shadow-sm)',
                  padding: 20,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, .95fr) minmax(260px, 1fr)',
                  gap: 20,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    minHeight: 160,
                    borderRadius: 'var(--nfcap-radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src="/images/learner/tile-installation.jpg"
                    alt=""
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <Badge tone="info">In Progress</Badge>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      lineHeight: 1.25,
                      color: 'var(--ink)',
                    }}
                  >
                    {nextUp.course.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.45 }}>
                    Next up: {nextUp.nextLesson.lesson.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        height: 6,
                        background: 'var(--nfcap-border)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--nfcap-accent)',
                          width: `${Math.round(((progressMap[nextUp.course.id]?.completedLessonIds.length ?? 0) / courseLessonCount(nextUp.course)) * 100)}%`,
                        }}
                      />
                    </div>
                    <b style={{ fontSize: 12, color: 'var(--ink)' }}>
                      {Math.round(
                        ((progressMap[nextUp.course.id]?.completedLessonIds.length ?? 0) /
                          courseLessonCount(nextUp.course)) *
                          100,
                      )}
                      %
                    </b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Button
                      size="lg"
                      onClick={() => router.push(`/learner/courses/${nextUp.course.id}`)}
                    >
                      Continue Lesson
                      <Icon name="arrow-right" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                borderRadius: 'var(--nfcap-radius-lg)',
                background: 'var(--surface-muted)',
                border: '1px solid var(--nfcap-border)',
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="lrn-sechead">
              <h2>Your pathway — {pathway[0]?.category ?? 'Apprenticeship'}</h2>
              <span style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 600 }}>
                {completedModules} of {pathway.length} complete
              </span>
            </div>
            <div
              style={{
                height: 5,
                background: 'var(--nfcap-border)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                margin: '-4px 2px 2px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pathwayPercent}%`,
                  background: 'var(--nfcap-accent)',
                }}
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 92px',
                gap: 16,
              }}
            >
              {pathway.slice(0, 3).map((course, index) => {
                const progress = progressMap[course.id];
                const locked =
                  !progress?.enrolled &&
                  course.access === 'restricted' &&
                  !unlockedCourseSlugs.includes(course.id);
                const status = getCourseStatus(course, progress);
                return (
                  <button
                    key={course.id}
                    type="button"
                    className="lrn-mcard"
                    onClick={() => router.push(`/learner/courses/${course.id}`)}
                    disabled={locked}
                  >
                    <Image
                      src={MODULE_PHOTOS[index % MODULE_PHOTOS.length]}
                      alt=""
                      width={300}
                      height={108}
                      className="thumb"
                    />
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
          </div>

          {credentials.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="lrn-sechead">
                <h2>Certificates</h2>
                <Link href="/learner/certificates">View all certificates →</Link>
              </div>
              <div className="cert-row-list">
                {credentials.slice(0, 3).map((credential) => (
                  <div className="cert-row" key={credential.certificateId}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--nfcap-radius-md)',
                        background: 'var(--status-complete-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--status-complete)',
                      }}
                    >
                      <Icon name="award" className="h-5 w-5" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                        {credential.course.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                        Certificate ID {credential.certificateId}
                      </div>
                    </div>
                    <Link href="/learner/certificates">
                      <Button size="sm" variant="secondary">
                        <Icon name="file-text" className="h-3 w-3" />
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              </div>
            </div>
          )}

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

          <div
            style={{
              borderRadius: 'var(--nfcap-radius-lg)',
              overflow: 'hidden',
              position: 'relative',
              height: 180,
            }}
          >
            <Image
              src="/images/learner/flooring-fundamentals.jpg"
              alt=""
              fill
              style={{ objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                background: 'linear-gradient(180deg, rgba(9,28,65,0.1), rgba(9,28,65,0.88))',
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.3,
                  marginBottom: 10,
                }}
              >
                Build your skills.
                <br />
                Grow your career.
              </div>
              <Link
                href="/learner/explore"
                style={{
                  background: '#fff',
                  color: '#102047',
                  padding: '8px 14px',
                  borderRadius: 'var(--nfcap-radius-md)',
                  fontSize: 12,
                  fontWeight: 700,
                  alignSelf: 'flex-start',
                  textDecoration: 'none',
                }}
              >
                Explore pathways →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
