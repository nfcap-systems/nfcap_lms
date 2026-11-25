'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { Icon } from '@/components/icons';
import { LockedCourseDialog, LOCKED_COURSE_COPY } from '@/components/learner/LockedCourseDialog';
import { generateCertificatePublicSlug } from '@/lib/actions/credentials';
import { courseLessonCount } from '@/lib/types';
import type { AdminCourse } from '@/lib/data/courses';
import type { CourseProgress } from '@/lib/data/progress';
import type { Credential } from '@/lib/data/credentials';
import { CertificateCard } from '@/components/learner/CertificateCard';

export function CertificatesView({
  pathway,
  credentials,
  progressMap,
  unlockedCourseSlugs,
  learnerName,
}: {
  pathway: AdminCourse[];
  credentials: Credential[];
  progressMap: Record<string, CourseProgress>;
  unlockedCourseSlugs: string[];
  learnerName: string;
}) {
  const router = useRouter();
  const [lockedCourse, setLockedCourse] = useState<AdminCourse | null>(null);
  const [, startSampleTransition] = useTransition();
  const earnedByCourseId = new Map(credentials.map((c) => [c.course.id, c]));

  function viewSampleVerification() {
    const sample = credentials[0];
    if (!sample) return;
    startSampleTransition(async () => {
      try {
        const slug = await generateCertificatePublicSlug(sample.rawId);
        router.push(`/verify/${slug}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not open the sample verification page.');
      }
    });
  }
  const nextUp = pathway.find((course) => {
    const progress = progressMap[course.id];
    return progress?.enrolled && !earnedByCourseId.has(course.id);
  });
  const nextUpTotal = nextUp ? courseLessonCount(nextUp) : 0;
  const nextUpDone = nextUp ? (progressMap[nextUp.id]?.completedLessonIds.length ?? 0) : 0;
  const nextUpPercent = nextUpTotal > 0 ? Math.round((nextUpDone / nextUpTotal) * 100) : 0;

  // Board's condition (LRN08b-CertificatesEmpty) is "zero certificates earned", not "no courses
  // at all" — the common real case (enrolled, in progress, nothing earned yet) was previously
  // rendering the credentials grid with every card muted instead of this screen.
  if (credentials.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--ink)',
            }}
          >
            Certificates
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 4 }}>
            View, download as a PDF, or share a public verification link.
          </div>
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
            <Icon name="award" className="h-7 w-7" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 430 }}>
            <b style={{ fontSize: 19, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
              No certificates earned yet
            </b>
            <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
              Finish a module to earn your first certificate — it&apos;ll appear here automatically,
              ready to view, download as a PDF, and share.
            </div>
          </div>
          <Button onClick={() => router.push('/learner/my-learning')}>Go to My Learning</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--ink)',
          }}
        >
          Certificates
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 4 }}>
          View, download as a PDF, or share a public verification link.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        <div className="lrn-stat">
          <span className="lrn-stat-icon" style={{ background: '#f0fdf4', color: '#166534' }}>
            <Icon name="award" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">
              {credentials.length} / {pathway.length}
            </span>
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
            <span className="n">{nextUp ? `${nextUpPercent}%` : '—'}</span>
            <span className="l">To next certificate</span>
          </div>
        </div>
        <div className="lrn-stat">
          <span className="lrn-stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Icon name="download" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">PDF</span>
            <span className="l">Download, any time</span>
          </div>
        </div>
        <div className="lrn-stat">
          <span className="lrn-stat-icon" style={{ background: '#f3eefe', color: '#7c3aed' }}>
            <Icon name="shield" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">Verified</span>
            <span className="l">Shareable, public link</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div className="lrn-sechead">
            <h2>Your credentials</h2>
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}
          >
            {pathway.map((course) => {
              const credential = earnedByCourseId.get(course.id);
              if (credential) {
                return (
                  <CertificateCard
                    key={course.id}
                    credential={credential}
                    learnerName={learnerName}
                  />
                );
              }

              const progress = progressMap[course.id];
              const locked =
                !progress?.enrolled &&
                course.access === 'restricted' &&
                !unlockedCourseSlugs.includes(course.id);
              const total = courseLessonCount(course);
              const done = progress?.completedLessonIds.length ?? 0;
              const percent = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <div
                  key={course.id}
                  role={locked ? 'button' : undefined}
                  tabIndex={locked ? 0 : undefined}
                  onClick={locked ? () => setLockedCourse(course) : undefined}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--nfcap-border)',
                    borderRadius: 'var(--nfcap-radius-lg)',
                    boxShadow: 'var(--nfcap-shadow-sm)',
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    opacity: locked ? 0.55 : 0.85,
                    cursor: locked ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 'var(--nfcap-radius-md)',
                        background: 'var(--surface-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink-faint)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={locked ? 'lock' : 'award'} className="h-6 w-6" />
                    </div>
                    <div>
                      <b style={{ fontSize: 15, color: 'var(--ink)' }}>{course.title}</b>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2 }}>
                        {locked
                          ? LOCKED_COURSE_COPY
                          : progress?.enrolled
                            ? `${percent}% complete`
                            : 'Not yet earned'}
                      </div>
                    </div>
                  </div>
                  {!locked && progress?.enrolled && (
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
                          width: `${percent}%`,
                          background: 'var(--nfcap-accent)',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="lrn-side-panel"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4, #f7fffb)',
              borderColor: '#bbf7d0',
            }}
          >
            <div className="lrn-side-title">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="check" className="h-3.5 w-3.5" style={{ color: '#166534' }} />
                How verification works
              </h3>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                fontSize: 12.5,
                color: 'var(--ink-muted)',
                lineHeight: 1.5,
              }}
            >
              <Icon
                name="check"
                className="h-3.5 w-3.5"
                style={{ color: 'var(--nfcap-accent)', flexShrink: 0, marginTop: 2 }}
              />
              Every earned certificate gets a public verification link — no login needed to check
              it.
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                fontSize: 12.5,
                color: 'var(--ink-muted)',
                lineHeight: 1.5,
              }}
            >
              <Icon
                name="check"
                className="h-3.5 w-3.5"
                style={{ color: 'var(--nfcap-accent)', flexShrink: 0, marginTop: 2 }}
              />
              Employers and workforce boards can confirm it was genuinely issued by NFCAP — use
              &quot;Copy verify link&quot; on any earned certificate above.
            </div>
            {credentials.length > 0 && (
              <button
                type="button"
                onClick={viewSampleVerification}
                style={{
                  fontSize: 12.5,
                  color: 'var(--nfcap-accent)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                See a sample verification page →
              </button>
            )}
          </div>

          {nextUp && (
            <div className="lrn-side-panel">
              <div className="lrn-side-title">
                <h3>Next up</h3>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Finish <strong style={{ color: 'var(--ink)' }}>{nextUp.title}</strong> to earn your
                next certificate — you&apos;re {nextUpPercent}% through.
              </div>
              <Button
                size="sm"
                style={{ width: '100%' }}
                onClick={() => router.push(`/learner/courses/${nextUp.id}`)}
              >
                Continue course
              </Button>
            </div>
          )}

          <div className="lrn-side-panel">
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
                  Your mentor
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Not yet assigned</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <LockedCourseDialog course={lockedCourse} onClose={() => setLockedCourse(null)} />
    </div>
  );
}
