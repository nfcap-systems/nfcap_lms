'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { EvidenceStatus as PrismaEvidenceStatus } from '@/generated/prisma/enums';
import { requireAdmin, requireUser } from './guard';
import { getRole } from '@/lib/supabase/server';
import { logAuditEvent } from './audit';
import { containsSsnPattern } from '@/lib/pii';
import { enforceRateLimit } from '@/lib/rate-limit';
import { uploadEvidenceFile, getEvidenceFileSignedUrl } from '@/lib/supabase/evidence-storage';

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
  revalidatePath(`/admin/learners/${learnerId}/review/${courseSlug}`);
  revalidatePath('/admin/reviews');
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
  await logAuditEvent({
    actor: admin,
    action: 'GRANT_COURSE_UNLOCK',
    targetType: 'CourseUnlock',
    targetId: course.id,
    metadata: { learnerId, courseSlug },
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
  file: File | null,
): Promise<void> {
  const user = await requireUser();
  await enforceRateLimit(user.id, 'submit-evidence', 20, 15 * 60 * 1000);
  if (containsSsnPattern(description)) {
    throw new Error('Evidence description cannot contain a Social Security Number.');
  }
  const enrollment = await getOrCreateEnrollment(user.id, courseSlug);

  // Uploaded before the DB write (CLAUDE.md performance conventions — never hold a pooler slot
  // across a Storage call). Each submission gets its own storage object, same as WIOA documents —
  // a rejected-then-resubmitted EvidenceSubmission is a new row with a new file, not an overwrite.
  let filePath: string | undefined;
  if (file && file.size > 0) {
    filePath = `${user.id}/${enrollment.id}/${Date.now()}-${file.name}`;
    await uploadEvidenceFile(filePath, file);
  }

  await prisma.evidenceSubmission.create({
    data: {
      enrollmentId: enrollment.id,
      description,
      fileName: file && file.size > 0 ? file.name : undefined,
      filePath,
      status: PrismaEvidenceStatus.PENDING,
    },
  });
  revalidateLearnerViews(user.id, courseSlug);
}

/** Short-lived signed URL to view an evidence attachment — the learner who submitted it, or any
 * Admin reviewing it. Never a public URL, same pattern as `getWioaDocumentUrl`. */
export async function getEvidenceFileUrl(evidenceSubmissionId: string): Promise<string> {
  const user = await requireUser();
  const evidence = await prisma.evidenceSubmission.findUniqueOrThrow({
    where: { id: evidenceSubmissionId },
    include: { enrollment: true },
  });
  const isOwner = evidence.enrollment.learnerId === user.id;
  const isAdmin = getRole(user) === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw new Error('Not your evidence submission.');
  }
  if (!evidence.filePath) {
    throw new Error('No file attached to this submission.');
  }
  return getEvidenceFileSignedUrl(evidence.filePath);
}

type AdminActor = Awaited<ReturnType<typeof requireAdmin>>;

/** Shared by `setEvidenceStatus`, `bulkApproveEvidence`, and `finalizeCriterionReview`
 * (src/lib/actions/criterionReview.ts) — the one place a Certificate is materialized or retracted,
 * so the gated-certification rule below applies no matter which caller approves a submission.
 * A course can only be certified once (Certificate.enrollmentId unique); a later flip back to
 * rejected retracts it. Does not revalidate or require admin itself; callers do.
 *
 * Gated certification (feature #7, docs/plans/phase-3-and-design-migration-kickoff.md Step 2):
 * approving is refused unless every AssessmentCriterion with `mandatoryForCertification: true` on
 * this course has a CriterionAssessment with `met: true` on the submission being approved. This
 * is enforced here rather than only in the new per-criterion screen so there is exactly one path
 * to a Certificate, not two — a course with no criteria at all has nothing to satisfy and approves
 * exactly as it did before this feature existed. */
export async function applyEvidenceStatus(
  admin: AdminActor,
  learnerId: string,
  courseSlug: string,
  status: 'approved' | 'rejected',
  reviewerNote?: string,
): Promise<void> {
  const enrollment = await prisma.enrollment.findFirstOrThrow({
    where: { learnerId, course: { slug: courseSlug } },
    include: {
      evidenceSubmissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        include: { criterionAssessments: { select: { criterionId: true, met: true } } },
      },
      course: {
        select: { assessmentCriteria: { select: { id: true, mandatoryForCertification: true } } },
      },
    },
  });
  const evidence = enrollment.evidenceSubmissions[0];
  if (!evidence) throw new Error('No evidence submission to update.');

  if (status === 'approved') {
    const mandatoryIds = enrollment.course.assessmentCriteria
      .filter((c) => c.mandatoryForCertification)
      .map((c) => c.id);
    const metIds = new Set(
      evidence.criterionAssessments.filter((a) => a.met === true).map((a) => a.criterionId),
    );
    const unmetCount = mandatoryIds.filter((id) => !metIds.has(id)).length;
    if (unmetCount > 0) {
      throw new Error(
        `Cannot certify: ${unmetCount} mandatory criterion/criteria not yet marked Met. Use the per-criterion review screen.`,
      );
    }
  }

  const prismaStatus =
    status === 'approved' ? PrismaEvidenceStatus.APPROVED : PrismaEvidenceStatus.REJECTED;
  await prisma.evidenceSubmission.update({
    where: { id: evidence.id },
    data: {
      status: prismaStatus,
      statusUpdatedAt: new Date(),
      ...(reviewerNote !== undefined ? { reviewerNote } : {}),
    },
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

  await logAuditEvent({
    actor: admin,
    action: 'REVIEW_EVIDENCE',
    targetType: 'EvidenceSubmission',
    targetId: evidence.id,
    metadata: { status, learnerId, courseSlug },
  });
}

/** Admin-only evidence review (docs/product/PRODUCT_CONTEXT.md Section 5: a course completes only once
 * Admin verifies evidence). */
export async function setEvidenceStatus(
  learnerId: string,
  courseSlug: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const admin = await requireAdmin();
  await applyEvidenceStatus(admin, learnerId, courseSlug, status);
  revalidateLearnerViews(learnerId, courseSlug);
}

/** Reviewer Queue's "Bulk approve" (docs/plans/phase-3-and-design-migration-kickoff.md Step 2,
 * feature #6 / board ADM10-ReviewQueue) — approves every selected submission in one round trip
 * instead of one server-action call per row. Revalidates each distinct learner/course pair once,
 * not once per item. */
export async function bulkApproveEvidence(
  items: { learnerId: string; courseSlug: string }[],
): Promise<void> {
  const admin = await requireAdmin();
  for (const { learnerId, courseSlug } of items) {
    await applyEvidenceStatus(admin, learnerId, courseSlug, 'approved');
  }
  for (const { learnerId, courseSlug } of items) {
    revalidateLearnerViews(learnerId, courseSlug);
  }
}
