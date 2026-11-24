'use client';

import { useRouter } from 'next/navigation';
import { Button, Dialog } from '@/components/ui';
import { Icon } from '@/components/icons';
import type { AdminCourse } from '@/lib/data/courses';

// The board (LRN02-Pathway/LRN02b-PathwayLocked, LRN08-Certificates) describes "complete the
// previous module to unlock automatically" — the real app doesn't gate this way. A RESTRICTED
// course only opens via an explicit CourseUnlock grant (WIOA funding approval or Admin
// assignment), never by finishing lessons. This copy reflects that real mechanism instead of the
// board's literal wording (see docs/build/LRN_BATCH_DRIFT.md).
export const LOCKED_COURSE_COPY =
  'Available once NFCAP enrolls you in this course — based on your funding status or program placement.';

/** Shared lock-state dialog for any locked-course card (Home's pathway strip, My Learning,
 * Certificates' locked tier) — one copy of the explanation and the funding-status CTA. */
export function LockedCourseDialog({
  course,
  onClose,
}: {
  course: AdminCourse | null;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <Dialog
      open={course !== null}
      onClose={onClose}
      title={course ? `${course.title} is locked` : ''}
      footer={
        <Button
          onClick={() => {
            onClose();
            router.push('/learner/funding');
          }}
        >
          Check funding status
        </Button>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--surface-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-muted)',
          }}
        >
          <Icon name="lock" className="h-6 w-6" />
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-muted)' }}>{LOCKED_COURSE_COPY}</p>
      </div>
    </Dialog>
  );
}
