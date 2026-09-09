import type { StatusTone } from '@/components/ui/Badge';
import type { CourseProgress } from './data/progress';
import { courseLessonCount, type Course } from './types';

export type CourseStatusKey =
  | 'not-started'
  | 'in-progress'
  | 'awaiting-assessment'
  | 'awaiting-evidence'
  | 'pending-verification'
  | 'verified'
  | 'needs-resubmission';

export function getCourseStatus(
  course: Course,
  progress: CourseProgress | undefined,
): CourseStatusKey {
  if (!progress?.enrolled) return 'not-started';
  if (progress.evidence?.status === 'approved') return 'verified';
  if (progress.evidence?.status === 'rejected') return 'needs-resubmission';
  if (progress.evidence?.status === 'pending') return 'pending-verification';
  if (progress.quizAttempt?.passed) return 'awaiting-evidence';

  const total = courseLessonCount(course);
  const done = progress.completedLessonIds.length;
  if (total > 0 && done === total) return 'awaiting-assessment';
  if (done > 0) return 'in-progress';
  return 'not-started';
}

export const courseStatusLabel: Record<CourseStatusKey, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'awaiting-assessment': 'Assessment Pending',
  'awaiting-evidence': 'Evidence Pending',
  'pending-verification': 'Pending Verification',
  verified: 'Verified',
  'needs-resubmission': 'Needs Resubmission',
};

export const courseStatusTone: Record<CourseStatusKey, StatusTone> = {
  'not-started': 'neutral',
  'in-progress': 'info',
  'awaiting-assessment': 'info',
  'awaiting-evidence': 'info',
  'pending-verification': 'pending',
  verified: 'success',
  'needs-resubmission': 'danger',
};
