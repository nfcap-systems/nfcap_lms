'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { EvidenceStatus as PrismaEvidenceStatus } from '@/generated/prisma/enums';
import { requireAdmin, requireUser } from './guard';

function buildCertificateCode(courseSlug: string): string {
  return `NFCAP-${courseSlug.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
}

function revalidateLearnerViews(learnerId: string, courseSlug: string) {
  revalidatePath(`/learner/courses/${courseSlug}`);
  revalidatePath('/learner');
  revalidatePath('/learner/my-learning');
  revalidatePath('/learner/profile');
  revalidatePath('/learner/portfolio');
  revalidatePath('/learner/certificates');
  // Admin's dashboard/roster/detail all surface learner progress (enrollment counts, pending
  // review counts) — every progress change needs to reach them, not just Admin's own actions.
  revalidatePath('/admin');
  revalidatePath('/admin/learners');
  revalidatePath(`/admin/learners/${learnerId}`);
}

/** The one enrollment-check point for `enroll`, `markLessonComplete`, `recordQuizAttempt`, and
 * `submitEvidence` (docs/build/WIOA_BUILD_WORKFLOW.md Phase 4 — previously none of the four checked
 * access at all, the RESTRICTED lock was UI-only). Asks exactly one question per
 * docs/wioa/WIOA_INTEGRATION_PLAN.md Section 4: is the course OPEN, or does a CourseUnlock row exist
 * for this learner + course — never WioaCase or LearnerProfile.fundingSource directly. */
async function getOrCreateEnrollment(learnerId: string, courseSlug: string) {
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: courseSlug },
    select: { id: true, access: true },
  });

  if (course.access === 'RESTRICTED') {
    const unlock = await prisma.courseUnlock.findUnique({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
    });
    if (!unlock) {
      throw new Error('This course is restricted and has not been unlocked for you yet.');
    }
  }

  return prisma.enrollment.upsert({
    where: { learnerId_courseId: { learnerId, courseId: course.id } },
    update: {},
    create: { learnerId, courseId: course.id },
  });
}

/** Admin assignment path (WIOA_INTEGRATION_PLAN.md Section 4 — "the same 'real assignment
 * mechanism' PRODUCT_CONTEXT.md §15 already defers"). Write path only, no bulk UI — a minimal way
 * to demo a self-pay learner reaching a RESTRICTED course without a WioaCase. */
export async function grantCourseUnlock(learnerId: string, courseSlug: string): Promise<void> {
  const admin = await requireAdmin();
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: courseSlug },
    select: { id: true },
  });
  await prisma.courseUnlock.upsert({
    where: { learnerId_courseId: { learnerId, courseId: course.id } },
    update: {},
    create: { learnerId, courseId: course.id, source: 'ADMIN_ASSIGNMENT', grantedBy: admin.id },
  });
  revalidateLearnerViews(learnerId, courseSlug);
}

export async function enroll(courseSlug: string): Promise<void> {
  const user = await requireUser();
  await getOrCreateEnrollment(user.id, courseSlug);
  revalidateLearnerViews(user.id, courseSlug);
}

export async function markLessonComplete(courseSlug: string, lessonId: string): Promise<void> {
  const user = await requireUser();
  const enrollment = await getOrCreateEnrollment(user.id, courseSlug);
  await prisma.completedLesson.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: {},
    create: { enrollmentId: enrollment.id, lessonId },
  });
  revalidateLearnerViews(user.id, courseSlug);
}

export async function recordQuizAttempt(
  courseSlug: string,
  scorePercent: number,
  passed: boolean,
): Promise<void> {
  const user = await requireUser();
  const enrollment = await getOrCreateEnrollment(user.id, courseSlug);
  await prisma.quizAttempt.create({ data: { enrollmentId: enrollment.id, scorePercent, passed } });
  revalidateLearnerViews(user.id, courseSlug);
}

export async function submitEvidence(
  courseSlug: string,
  description: string,
  fileName?: string,
): Promise<void> {
  const user = await requireUser();
  const enrollment = await getOrCreateEnrollment(user.id, courseSlug);
  await prisma.evidenceSubmission.create({
    data: {
      enrollmentId: enrollment.id,
      description,
      fileName,
      status: PrismaEvidenceStatus.PENDING,
    },
  });
  revalidateLearnerViews(user.id, courseSlug);
}

/** Admin-only evidence review (docs/product/PRODUCT_CONTEXT.md Section 5: a course completes only once
 * Admin verifies evidence). Approving materializes a Certificate row; a later flip back to
 * rejected retracts it — a course can only be certified once (Certificate.enrollmentId unique). */
export async function setEvidenceStatus(
  learnerId: string,
  courseSlug: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  await requireAdmin();

  const enrollment = await prisma.enrollment.findFirstOrThrow({
    where: { learnerId, course: { slug: courseSlug } },
    include: { evidenceSubmissions: { orderBy: { submittedAt: 'desc' }, take: 1 } },
  });
  const evidence = enrollment.evidenceSubmissions[0];
  if (!evidence) throw new Error('No evidence submission to update.');

  const prismaStatus =
    status === 'approved' ? PrismaEvidenceStatus.APPROVED : PrismaEvidenceStatus.REJECTED;
  await prisma.evidenceSubmission.update({
    where: { id: evidence.id },
    data: { status: prismaStatus, statusUpdatedAt: new Date() },
  });

  if (status === 'approved') {
    await prisma.certificate.upsert({
      where: { enrollmentId: enrollment.id },
      update: { evidenceSubmissionId: evidence.id },
      create: {
        enrollmentId: enrollment.id,
        evidenceSubmissionId: evidence.id,
        certificateCode: buildCertificateCode(courseSlug),
      },
    });
  } else {
    // Admin flipping an approved submission back to rejected retracts the certificate it earned.
    await prisma.certificate.deleteMany({ where: { enrollmentId: enrollment.id } });
  }

  revalidateLearnerViews(learnerId, courseSlug);
}
