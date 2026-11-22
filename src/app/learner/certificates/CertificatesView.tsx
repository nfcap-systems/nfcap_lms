'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Icon } from '@/components/icons';
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
  const earnedByCourseId = new Map(credentials.map((c) => [c.course.id, c]));
  const nextUp = pathway.find((course) => {
    const progress = progressMap[course.id];
    return progress?.enrolled && !earnedByCourseId.has(course.id);
  });
  const nextUpTotal = nextUp ? courseLessonCount(nextUp) : 0;
  const nextUpDone = nextUp ? progressMap[nextUp.id]?.completedLessonIds.length ?? 0 : 0;
  const nextUpPercent = nextUpTotal > 0 ? Math.round((nextUpDone / nextUpTotal) * 100) : 0;

  if (pathway.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
          Certificates
        </div>
        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            padding: 28,
          }}
        >
          <p style={{ fontSize: 13.5, color: 'var(--ink-muted)' }}>
            Complete a course&apos;s lessons, pass its Knowledge Assessment, and submit Practical
            Evidence. Once NFCAP staff verify it, your certificate appears here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
          Certificates
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 4 }}>
          On-screen today — a downloadable PDF and public verification link are Phase 4 work, not
          available here yet.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
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
          <span className="lrn-stat-icon" style={{ background: '#eff6ff', color: 'var(--accent)' }}>
            <Icon name="bar-chart" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">{nextUp ? `${nextUpPercent}%` : '—'}</span>
            <span className="l">To next certificate</span>
          </div>
        </div>
        <div className="lrn-stat">
          <span className="lrn-stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Icon name="clock" className="h-5 w-5" />
          </span>
          <div className="vals">
            <span className="n">PDF</span>
            <span className="l">Download — Phase 4</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div className="lrn-sechead">
            <h2>Your credentials</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
            {pathway.map((course) => {
              const credential = earnedByCourseId.get(course.id);
              if (credential) {
                return <CertificateCard key={course.id} credential={credential} learnerName={learnerName} />;
              }

              const progress = progressMap[course.id];
              const locked = !progress?.enrolled && course.access === 'restricted' && !unlockedCourseSlugs.includes(course.id);
              const total = courseLessonCount(course);
              const done = progress?.completedLessonIds.length ?? 0;
              const percent = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <div
                  key={course.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)',
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    opacity: locked ? 0.55 : 0.85,
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 'var(--radius-md)',
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
                        {locked ? 'Locked' : progress?.enrolled ? `${percent}% complete` : 'Not yet earned'}
                      </div>
                    </div>
                  </div>
                  {!locked && progress?.enrolled && (
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percent}%`, background: 'var(--accent)' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="lrn-side-panel" style={{ background: 'linear-gradient(135deg, #f0fdf4, #f7fffb)', borderColor: '#bbf7d0' }}>
            <div className="lrn-side-title">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="check" className="h-3.5 w-3.5" style={{ color: '#166534' }} />
                How verification works
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              <Icon name="check" className="h-3.5 w-3.5" style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              Certificates are issued once NFCAP staff verify your Practical Evidence.
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              <Icon name="check" className="h-3.5 w-3.5" style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              A public, no-login verification link for employers and workforce boards is planned
              for Phase 4 — not available yet.
            </div>
          </div>

          {nextUp && (
            <div className="lrn-side-panel">
              <div className="lrn-side-title">
                <h3>Next up</h3>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Finish <strong style={{ color: 'var(--ink)' }}>{nextUp.title}</strong> to earn your next
                certificate — you&apos;re {nextUpPercent}% through.
              </div>
              <Button size="sm" style={{ width: '100%' }} onClick={() => router.push(`/learner/courses/${nextUp.id}`)}>
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
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Your mentor</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Not yet assigned</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
