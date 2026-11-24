import { Badge } from '@/components/ui';
import { Icon } from '@/components/icons';

/** Shown wherever a RESTRICTED course is reached without a CourseUnlock — course overview, and
 * every lesson/quiz/evidence route a learner could otherwise deep-link into directly. A learner
 * can hold a stale Enrollment row from before this lock existed (or from an admin demo flow), so
 * every one of those routes must gate on `access === 'restricted' && !unlocked` on its own, not on
 * `enrolled`, to match the single access rule `getOrCreateEnrollment`
 * (src/lib/actions/progress.ts) already enforces server-side. */
export function RestrictedCourseNotice({ courseTitle }: { courseTitle: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--nfcap-border)',
        borderRadius: 'var(--nfcap-radius-lg)',
        boxShadow: 'var(--nfcap-shadow-sm)',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--status-problem-bg)',
          color: 'var(--status-problem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="lock" className="h-5 w-5" />
      </div>
      <Badge tone="restricted">Restricted</Badge>
      <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: 'var(--ink)' }}>
        {courseTitle}
      </h1>
      <p style={{ margin: 0, maxWidth: 480, fontSize: 13.5, color: 'var(--ink-muted)' }}>
        This course is assigned by NFCAP staff based on your program placement and prior progress.
        It isn&apos;t open for self-enrollment yet.
      </p>
    </div>
  );
}
