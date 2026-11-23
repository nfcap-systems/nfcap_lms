'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { Icon } from '@/components/icons';
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
        <div
          style={{
            borderRadius: 'var(--nfcap-radius-lg)',
            background: 'var(--surface-muted)',
            border: '1px solid var(--nfcap-border)',
            padding: 28,
          }}
        >
          <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginBottom: 12 }}>
            You&apos;re not enrolled in any courses yet.
          </p>
          <Button size="sm" onClick={() => router.push('/learner/explore')}>
            Browse Course Catalog
          </Button>
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
          className={tab === 'in-progress' ? 'ptab on' : 'ptab'}
          onClick={() => setTab('in-progress')}
        >
          In Progress
        </button>
        <button
          type="button"
          className={tab === 'completed' ? 'ptab on' : 'ptab'}
          onClick={() => setTab('completed')}
        >
          Completed
        </button>
        <button
          type="button"
          className={tab === 'certificates' ? 'ptab on' : 'ptab'}
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
            const locked =
              !progress?.enrolled &&
              course.access === 'restricted' &&
              !unlockedCourseSlugs.includes(course.id);
            const status = getCourseStatus(course, progress);
            const total = courseLessonCount(course);
            const done = progress?.completedLessonIds.length ?? 0;

            if (locked) {
              return (
                <div
                  key={course.id}
                  className="lrn-mcard"
                  style={{ opacity: 0.65, cursor: 'default' }}
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
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Locked</div>
                    <Badge tone="neutral" style={{ width: 'fit-content' }}>
                      <Icon name="lock" className="h-3 w-3" />
                      Locked
                    </Badge>
                  </div>
                </div>
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
            completedCourses.map((course, index) => (
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
                  <Badge tone="success" style={{ width: 'fit-content' }}>
                    Complete
                  </Badge>
                </div>
              </button>
            ))
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
    </div>
  );
}
