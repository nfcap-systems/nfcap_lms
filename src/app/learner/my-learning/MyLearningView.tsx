'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import { LockedCourseDialog, LOCKED_COURSE_COPY } from '@/components/learner/LockedCourseDialog';
import { courseLessonCount } from '@/lib/types';
import { getCourseStatus, courseStatusLabel, courseStatusTone } from '@/lib/course-status';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import type { Credential } from '@/lib/data/credentials';

// Only 3 real trade photos exist for this retrofit (pulled from the design canvas); cycle
// through them for module cards rather than inventing per-course imagery.
const MODULE_PHOTOS = [
  '/images/learner/safety-tools.jpg',
  '/images/learner/flooring-fundamentals.jpg',
  '/images/learner/tile-installation.jpg',
];

type Tab = 'in-progress' | 'completed' | 'certificates';

export function MyLearningView({
  pathway,
  progressMap,
  unlockedCourseSlugs,
  credentials,
}: {
  pathway: AdminCourse[];
  progressMap: Record<string, CourseProgress>;
  unlockedCourseSlugs: string[];
  credentials: Credential[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('in-progress');
  const [lockedCourse, setLockedCourse] = useState<AdminCourse | null>(null);

  const completedCourses = pathway.filter((c) => !!progressMap[c.id]?.certificateId);
  const completedModules = completedCourses.length;

  if (pathway.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--ink)',
          }}
        >
          My Learning
        </div>
        <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid var(--nfcap-border)' }}>
          <span className="lrn-tab on">In Progress</span>
          <span className="lrn-tab">Completed</span>
          <span className="lrn-tab">Certificates</span>
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--nfcap-border)',
            borderRadius: 'var(--nfcap-radius-lg)',
            boxShadow: 'var(--nfcap-shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 18,
            padding: '88px 24px',
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--surface-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-muted)',
            }}
          >
            <Icon name="compass" className="h-7 w-7" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 430 }}>
            <b style={{ fontSize: 19, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
              No courses in your pathway yet
            </b>
            <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
              Once your WIOA funding is approved, your assigned pathway unlocks here automatically.
              You can also browse the open catalog and enroll in a self-paced course today — no
              funding decision required.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <Button onClick={() => router.push('/learner/explore')}>Browse Course Catalog</Button>
            <Button variant="secondary" onClick={() => router.push('/learner/funding')}>
              Check funding status
            </Button>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: 'var(--nfcap-radius-lg)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--nfcap-radius-md)',
              background: '#dbeafe',
              color: 'var(--nfcap-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="alert-circle" className="h-4 w-4" />
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
            Already submitted funding outreach? Status updates appear on{' '}
            <Link
              href="/learner/funding"
              style={{ color: 'var(--nfcap-accent)', fontWeight: 600, textDecoration: 'underline' }}
            >
              Funding Status
            </Link>{' '}
            as your coordinator reviews your case.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: 'var(--ink)',
        }}
      >
        My Learning
      </div>

      <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid var(--nfcap-border)' }}>
        <button
          type="button"
          className={tab === 'in-progress' ? 'lrn-tab on' : 'lrn-tab'}
          onClick={() => setTab('in-progress')}
        >
          In Progress
        </button>
        <button
          type="button"
          className={tab === 'completed' ? 'lrn-tab on' : 'lrn-tab'}
          onClick={() => setTab('completed')}
        >
          Completed
        </button>
        <button
          type="button"
          className={tab === 'certificates' ? 'lrn-tab on' : 'lrn-tab'}
          onClick={() => setTab('certificates')}
        >
          Certificates
        </button>
      </div>

      <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
        {pathway[0]?.category ?? 'Apprenticeship'} · {completedModules} of {pathway.length} modules
        complete
      </div>

      {tab === 'in-progress' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          {pathway.map((course, index) => {
            const progress = progressMap[course.id];
            // Same rule as CourseOverviewView's gate on `/learner/courses/[courseId]` — a stale
            // Enrollment row from before this restriction existed must not make a restricted,
            // not-yet-unlocked course render as a clickable card that dead-ends on that route.
            const locked =
              course.access === 'restricted' && !unlockedCourseSlugs.includes(course.id);
            const status = getCourseStatus(course, progress);
            const total = courseLessonCount(course);
            const done = progress?.completedLessonIds.length ?? 0;

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

            return (
              <button
                key={course.id}
                type="button"
                className="lrn-mcard"
                onClick={() => router.push(`/learner/courses/${course.id}`)}
              >
                <Image
                  src={MODULE_PHOTOS[index % MODULE_PHOTOS.length]}
                  alt=""
                  width={300}
                  height={112}
                  className="thumb"
                />
                <div className="lrn-mcard-body">
                  <div className="t">{course.title}</div>
                  {status === 'in-progress' && total > 0 && (
                    <div
                      style={{
                        height: 5,
                        background: 'var(--nfcap-border)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.round((done / total) * 100)}%`,
                          background: 'var(--nfcap-accent)',
                        }}
                      />
                    </div>
                  )}
                  <Badge tone={courseStatusTone[status]} style={{ width: 'fit-content' }}>
                    {courseStatusLabel[status]}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'completed' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          {completedCourses.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', gridColumn: '1 / -1' }}>
              No courses completed yet.
            </p>
          ) : (
            completedCourses.map((course, index) => {
              // Same rule as CourseOverviewView's gate on `/learner/courses/[courseId]` — a
              // completed, certificated course can still be RESTRICTED-and-not-unlocked (unlock
              // isn't granted by completion), so this card must not promise a route that dead-ends.
              const locked =
                course.access === 'restricted' && !unlockedCourseSlugs.includes(course.id);

              return (
                <button
                  key={course.id}
                  type="button"
                  className="lrn-mcard"
                  onClick={() =>
                    locked
                      ? setLockedCourse(course)
                      : router.push(`/learner/courses/${course.id}`)
                  }
                >
                  <Image
                    src={MODULE_PHOTOS[index % MODULE_PHOTOS.length]}
                    alt=""
                    width={300}
                    height={112}
                    className="thumb"
                  />
                  <div className="lrn-mcard-body">
                    <div className="t">{course.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone="success" style={{ width: 'fit-content' }}>
                        Complete
                      </Badge>
                      {locked && (
                        <Badge tone="neutral" style={{ width: 'fit-content' }}>
                          <Icon name="lock" className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {tab === 'certificates' && (
        <div className="cert-row-list">
          {credentials.length === 0 ? (
            <div style={{ padding: 28 }}>
              <p style={{ fontSize: 13.5, color: 'var(--ink-muted)' }}>
                No certificates earned yet.
              </p>
            </div>
          ) : (
            credentials.map((credential) => (
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
            ))
          )}
        </div>
      )}

      <LockedCourseDialog course={lockedCourse} onClose={() => setLockedCourse(null)} />
    </div>
  );
}
