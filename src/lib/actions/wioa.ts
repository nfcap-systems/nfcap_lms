'use server';

import { revalidatePath } from 'next/cache';
import type { User } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import type {
  WioaEligibilityStatus,
  WioaFundingStatus,
  AppointmentType,
  WioaDocumentStatus,
} from '@/generated/prisma/enums';
import { requireUser, requireCoordinator } from './guard';
import { getRole } from '@/lib/supabase/server';
import { matchWorkforceOffice } from '@/lib/wioa/matching';
import { shouldRequireEdd, EDD_REQUIREMENT_NAME } from '@/lib/wioa/documents';
import { nextEligibilityStatusOptions, nextFundingStatusOptions } from '@/lib/wioa/status';
import { uploadWioaDocumentFile, getWioaDocumentSignedUrl } from '@/lib/supabase/wioa-storage';
import { logAuditEvent } from './audit';
import { containsSsnPattern } from '@/lib/pii';
import { enforceRateLimit } from '@/lib/rate-limit';
import { withRlsContext } from '@/lib/db/rls';
import type { PrismaClient } from '@/generated/prisma/client';
import { getLearnerById, getPartnerStaffRoster } from '@/lib/data/learners';
import { sendEmail } from '@/lib/email';

/** Master-case-level authorization for staff actions on eligibility data (documents, status,
 * appointments, assignment) — Coordinator for any case, Partner Staff only for their assigned
 * cases. Deliberately stays on the plain `prisma` client rather than `withRlsContext`
 * (docs/build/PHASE_1_PROGRESS.md) — this lookup's only job is deciding access, not returning
 * data to the caller; `tests/unit/wioa-status.test.ts` pins the exact "Not your assigned case."
 * message. Every actual data read/write below this check uses `withRlsContext`, so RLS still
 * backs the real security boundary even though this one gate read doesn't. */
async function requireMasterCaseAccess(masterCaseId: string): Promise<User> {
  const user = await requireUser();
  const role = getRole(user);
  if (role === 'WIOA_COORDINATOR') return user;
  if (role === 'PARTNER_STAFF') {
    const masterCase = await prisma.wioaCase.findUniqueOrThrow({ where: { id: masterCaseId } });
    if (masterCase.assignedPartnerStaffId !== user.id) {
      throw new Error('Not your assigned case.');
    }
    return user;
  }
  throw new Error('Coordinator or Partner Staff access required.');
}

/** Same as `requireMasterCaseAccess`, resolved from a course-case id (funding-stage actions are
 * keyed by course-case, but assignment lives on the master). */
async function requireCourseCaseAccess(courseCaseId: string): Promise<User> {
  const courseCase = await prisma.wioaCourseCase.findUniqueOrThrow({
    where: { id: courseCaseId },
    select: { masterCaseId: true },
  });
  return requireMasterCaseAccess(courseCase.masterCaseId);
}

function orNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? '').trim();
  return str.length > 0 ? str : null;
}

/** Lets an existing account (signed up before this module existed, or one that skipped the
 * WIOA section at signup) enter matching details later from the Funding page — the plan's
 * "editable later from Profile or the Funding area" note (WIOA_INTEGRATION_PLAN.md Section 5). */
/** Spec Section 8 (page 5): "Age 18+" is a profile validation rule, not a document — checked here
 * since this is the one write path for dateOfBirth (docs/plans/wioa-spec-alignment-kickoff.md
 * #3). Blocks the save rather than a soft warning — WIOA apprenticeship funding genuinely
 * requires the applicant to be 18+, so letting an under-18 profile save and only flagging it later
 * would let the whole outreach/eligibility flow start on a profile that can never actually
 * qualify. */
function requireAge18Plus(dateOfBirth: string): void {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) throw new Error('Enter a valid date of birth.');
  const eighteenthBirthday = new Date(dob);
  eighteenthBirthday.setFullYear(dob.getFullYear() + 18);
  if (eighteenthBirthday.getTime() > Date.now()) {
    throw new Error('You must be at least 18 years old to start the WIOA eligibility process.');
  }
}

export async function updateWioaProfile(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateOfBirth = String(formData.get('dateOfBirth') ?? '');
  if (dateOfBirth) requireAge18Plus(dateOfBirth);

  // RLS-scoped (docs/build/PHASE_1_DB_ACCESS_DECISION.md) — always the caller's own profile.
  await withRlsContext({ userId: user.id, role: getRole(user) ?? 'LEARNER' }, (tx) =>
    tx.learnerProfile.upsert({
      where: { learnerId: user.id },
      create: {
        learnerId: user.id,
        fundingSource: 'WIOA_PENDING',
        streetAddress: orNull(formData.get('streetAddress')),
        city: orNull(formData.get('city')),
        state: orNull(formData.get('state')),
        zip: orNull(formData.get('zip')),
        preferredLanguage: orNull(formData.get('preferredLanguage')),
        employmentStatus: orNull(formData.get('employmentStatus')),
        unemploymentInsuranceStatus: orNull(formData.get('unemploymentInsuranceStatus')),
        trainingApprenticeshipInterest: orNull(formData.get('trainingApprenticeshipInterest')),
        mobilePhone: orNull(formData.get('mobilePhone')),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      update: {
        fundingSource: 'WIOA_PENDING',
        streetAddress: orNull(formData.get('streetAddress')),
        city: orNull(formData.get('city')),
        state: orNull(formData.get('state')),
        zip: orNull(formData.get('zip')),
        preferredLanguage: orNull(formData.get('preferredLanguage')),
        employmentStatus: orNull(formData.get('employmentStatus')),
        unemploymentInsuranceStatus: orNull(formData.get('unemploymentInsuranceStatus')),
        trainingApprenticeshipInterest: orNull(formData.get('trainingApprenticeshipInterest')),
        mobilePhone: orNull(formData.get('mobilePhone')),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    }),
  );

  revalidatePath('/learner/funding');
}

/** Creates the master case's eligibility document checklist — one WioaDocument (MISSING) per
 * requirement scoped to the matched board, skipping the EDD Award Letter unless the learner's
 * profile indicates recent UI activity. Takes the caller's RLS transaction client. */
async function createCaseDocumentChecklist(
  tx: PrismaClient,
  masterCaseId: string,
  workforceBoardId: string,
  unemploymentInsuranceStatus: string | null,
): Promise<void> {
  const requirements = await tx.wioaDocumentRequirement.findMany({
    where: { workforceBoardId },
  });
  const applicable = requirements.filter(
    (r) =>
      !r.conditional ||
      (r.name === EDD_REQUIREMENT_NAME && shouldRequireEdd(unemploymentInsuranceStatus)),
  );
  if (applicable.length === 0) return;

  await tx.wioaDocument.createMany({
    data: applicable.map((r) => ({
      masterCaseId,
      requirementId: r.id,
      status: 'MISSING' as const,
    })),
  });
}

/** Confirm-send action for the WIOA outreach email (spec Section 3 steps 3-6; WIOA_INTEGRATION_
 * PLAN.md Section 6/11) — generates, lets the student edit, then sends and logs. First send ever
 * for a learner creates their master WioaCase (docs/plans/wioa-spec-alignment-kickoff.md #1, full
 * split — eligibility is course-less, matching the spec's registration -> match -> outreach flow
 * with no course selection involved), matches a workforce board/AJCC/contact, and generates that
 * board's document checklist. A second send against an already-open case just logs another
 * communication row against it. */
export async function sendWioaOutreach(
  contactId: string | null,
  recipient: string,
  subject: string,
  body: string,
): Promise<void> {
  const user = await requireUser();
  const role = getRole(user) ?? 'LEARNER';

  const masterCaseId = await withRlsContext({ userId: user.id, role }, async (tx) => {
    let masterCase = await tx.wioaCase.findUnique({ where: { learnerId: user.id } });

    if (!masterCase) {
      const profile = await tx.learnerProfile.findUnique({ where: { learnerId: user.id } });
      const match = profile?.zip ? await matchWorkforceOffice(profile.zip, profile.city) : null;

      masterCase = await tx.wioaCase.create({
        data: {
          learnerId: user.id,
          workforceBoardId: match?.board.id,
          ajccCenterId: match?.ajcc?.id,
          contactId: match?.contact?.id ?? contactId ?? undefined,
          status: 'INITIAL_CONTACT_SENT',
        },
      });

      await tx.wioaStatusHistory.create({
        data: { masterCaseId: masterCase.id, status: 'INITIAL_CONTACT_SENT', changedBy: user.id },
      });

      if (masterCase.workforceBoardId) {
        await createCaseDocumentChecklist(
          tx,
          masterCase.id,
          masterCase.workforceBoardId,
          profile?.unemploymentInsuranceStatus ?? null,
        );
      }
    }

    return masterCase.id;
  });

  // Sent outside the RLS transaction (CLAUDE.md performance conventions — never hold a pooler
  // slot across a network call). replyTo is the learner's own address, not NFCAP's sending
  // address, so a reply from the workforce board reaches the student directly.
  //
  // Spec Section 19: "Every outgoing email must be logged with recipient, timestamp, and status"
  // (docs/plans/wioa-spec-alignment-kickoff.md #7) — a failed send now gets its own logged row
  // instead of vanishing (this session's earlier deliverability fix made failures silent by only
  // ever writing a row after success; that regression is what this closes).
  let failureReason: string | null = null;
  try {
    await sendEmail({ to: recipient, subject, html: body, replyTo: user.email });
  } catch (err) {
    failureReason = err instanceof Error ? err.message : 'Unknown error';
  }

  await withRlsContext({ userId: user.id, role }, (tx) =>
    tx.wioaCommunication.create({
      data: {
        learnerId: user.id,
        masterCaseId,
        contactId: contactId ?? undefined,
        channel: 'EMAIL',
        recipient,
        subject,
        body,
        status: failureReason ? 'FAILED' : 'SENT',
        failureReason,
      },
    }),
  );

  revalidatePath('/learner/funding');

  if (failureReason) {
    throw new Error('Could not send this email. Please try again.');
  }
}

/** Learner picks a course to request WIOA funding for, once they're WIOA Eligible (spec Section 3
 * step 10 — "Once eligible, track the ETPL apprenticeship training funding request"). Creates the
 * WioaCourseCase/funding record; the eligibility side (master case) is untouched. */
export async function requestCourseFunding(courseSlug: string): Promise<void> {
  const user = await requireUser();
  const role = getRole(user) ?? 'LEARNER';
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: courseSlug },
    select: { id: true },
  });

  await withRlsContext({ userId: user.id, role }, async (tx) => {
    const masterCase = await tx.wioaCase.findUnique({ where: { learnerId: user.id } });
    if (!masterCase) {
      throw new Error('Start the WIOA eligibility process before requesting course funding.');
    }
    if (masterCase.status !== 'WIOA_ELIGIBLE') {
      throw new Error('You must be WIOA Eligible before requesting funding for a course.');
    }

    const existing = await tx.wioaCourseCase.findFirst({
      where: { learnerId: user.id, courseId: course.id, closedAt: null },
    });
    if (existing) return;

    const courseCase = await tx.wioaCourseCase.create({
      data: { learnerId: user.id, courseId: course.id, masterCaseId: masterCase.id },
    });
    await tx.wioaFundingStatusHistory.create({
      data: {
        courseCaseId: courseCase.id,
        status: 'ETPL_TRAINING_REQUESTED',
        changedBy: user.id,
      },
    });
  });

  revalidatePath('/learner/funding');
}

/** Document Upload Limits (docs/client/NFCAP_LMS_Feature_Detail_Client.md: "so files cannot
 * accumulate without bound as usage grows"). `enforceRateLimit` below already caps upload
 * *rate*, but every accepted upload keeps its storage object forever — so a learner re-uploading
 * the same document indefinitely, slowly, still accumulates unbounded files. This is the
 * separate, unbounded dimension: a hard cap on total uploads per document, independent of how
 * spread out in time they are. */
const MAX_UPLOADS_PER_DOCUMENT = 10;

/** Learner document upload (spec Section 9), against the master case's eligibility checklist.
 * Verifies the document belongs to the caller before touching Storage or the DB — a server action
 * can be invoked directly, so ownership can't be assumed from what the UI shows. */
export async function uploadWioaDocument(documentId: string, file: File): Promise<void> {
  const user = await requireUser();
  await enforceRateLimit(user.id, 'wioa-document-upload', 20, 15 * 60 * 1000);

  // Ownership-check read only, same deliberate trade-off as requireMasterCaseAccess above —
  // stays on the plain `prisma` client so a non-owner gets this function's explicit "Not your
  // document." instead of a generic not-found from RLS. The writes below use `withRlsContext`.
  const doc = await prisma.wioaDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: { masterCase: true },
  });
  if (doc.masterCase.learnerId !== user.id) {
    throw new Error('Not your document.');
  }

  // Total uploads so far = archived versions + the current live file, if any. Checked before
  // touching Storage so a learner who's hit the cap gets a clean error instead of an orphaned
  // upload. Same plain-`prisma` gating-read trade-off as the ownership check above.
  const priorVersionCount = await prisma.wioaDocumentVersion.count({ where: { documentId } });
  const totalUploads = priorVersionCount + (doc.uploadedAt ? 1 : 0);
  if (totalUploads >= MAX_UPLOADS_PER_DOCUMENT) {
    throw new Error(
      `This document has already been uploaded ${totalUploads} times, the most we allow. Contact your WIOA case manager if you need to submit a different file.`,
    );
  }

  // Each upload gets its own storage object — never overwritten or deleted — so a superseded
  // file (e.g. one later rejected) stays retrievable via its WioaDocumentVersion snapshot below.
  // Uploaded before the RLS transaction opens (CLAUDE.md performance conventions — never hold a
  // pooler slot across a Storage call).
  const path = `${user.id}/${doc.masterCaseId}/${doc.requirementId}/${Date.now()}-${file.name}`;
  await uploadWioaDocumentFile(path, file);

  const role = getRole(user) ?? 'LEARNER';
  await withRlsContext({ userId: user.id, role }, async (tx) => {
    // Archive the file this upload replaces (if any) before overwriting the row that pointed to
    // it, so its status/review outcome at time of replacement is preserved for the audit history.
    if (doc.storagePath && doc.fileName && doc.uploadedAt) {
      await tx.wioaDocumentVersion.create({
        data: {
          documentId: doc.id,
          fileName: doc.fileName,
          storagePath: doc.storagePath,
          uploadedAt: doc.uploadedAt,
          status: doc.status,
          reviewedBy: doc.reviewedBy,
          reviewedAt: doc.reviewedAt,
          rejectionReason: doc.rejectionReason,
        },
      });
    }

    await tx.wioaDocument.update({
      where: { id: documentId },
      data: {
        fileName: file.name,
        storagePath: path,
        status: 'UPLOADED',
        uploadedAt: new Date(),
        // A fresh upload clears any prior rejection — the resubmission is a new review, not a
        // continuation of the rejected one (spec Section 9 — "allow re-upload when rejected").
        rejectionReason: null,
        reviewedAt: null,
        reviewedBy: null,
      },
    });

    // Spec Section 9: "When all applicable documents are uploaded, change the case from
    // Documents Pending to Documents Submitted." Learner-triggered, the one exception to "every
    // transition is staff-driven". Folded into this same transaction, closing a race where a
    // concurrent upload of the last remaining document could double-fire this transition.
    if (doc.masterCase.status === 'DOCUMENTS_PENDING') {
      const remaining = await tx.wioaDocument.count({
        where: { masterCaseId: doc.masterCaseId, status: 'MISSING' },
      });
      if (remaining === 0) {
        await tx.wioaCase.update({
          where: { id: doc.masterCaseId },
          data: { status: 'DOCUMENTS_SUBMITTED' },
        });
        await tx.wioaStatusHistory.create({
          data: {
            masterCaseId: doc.masterCaseId,
            status: 'DOCUMENTS_SUBMITTED',
            changedBy: user.id,
          },
        });
      }
    }
  });

  // Spec Section 10: "Audit logs for view, download, upload, verification, and deletion events."
  // View/verify were already logged; upload wasn't (docs/plans/wioa-spec-alignment-kickoff.md
  // #4). Logged after the transaction commits, same ordering as every other audit call in this
  // file.
  await logAuditEvent({
    actor: user,
    action: 'UPLOAD_WIOA_DOCUMENT',
    targetType: 'WioaDocument',
    targetId: documentId,
  });

  revalidatePath('/learner/funding');
}

/** Short-lived signed URL for staff to view an uploaded document (WIOA_INTEGRATION_PLAN.md
 * Section 10 — never a public URL). Gated by requireMasterCaseAccess since the storage path alone
 * carries no access control. */
export async function getWioaDocumentUrl(documentId: string): Promise<string> {
  // Ownership-check read on the plain client, same trade-off as requireMasterCaseAccess above.
  const doc = await prisma.wioaDocument.findUniqueOrThrow({ where: { id: documentId } });
  const staff = await requireMasterCaseAccess(doc.masterCaseId);
  // Re-read through RLS now that access is confirmed, so the storage path actually returned to
  // the caller comes from the RLS-gated client rather than the bypass read above (which exists
  // only to learn the case id for requireMasterCaseAccess).
  const rlsDoc = await withRlsContext({ userId: staff.id, role: getRole(staff) ?? '' }, (tx) =>
    tx.wioaDocument.findUniqueOrThrow({ where: { id: documentId } }),
  );
  if (!rlsDoc.storagePath) throw new Error('No file uploaded for this document.');
  await logAuditEvent({
    actor: staff,
    action: 'VIEW_FUNDING_DOCUMENT',
    targetType: 'WioaDocument',
    targetId: documentId,
  });
  return getWioaDocumentSignedUrl(rlsDoc.storagePath);
}

export type WioaDocumentVersionRecord = {
  id: string;
  fileName: string;
  uploadedAt: Date;
  status: WioaDocumentStatus;
  rejectionReason: string | null;
};

/** Past uploads for one document requirement, most recent first — the file currently on the
 * WioaDocument row is not included (it's shown separately, not as "history"). */
export async function getWioaDocumentVersions(
  documentId: string,
): Promise<WioaDocumentVersionRecord[]> {
  const doc = await prisma.wioaDocument.findUniqueOrThrow({ where: { id: documentId } });
  const staff = await requireMasterCaseAccess(doc.masterCaseId);

  const versions = await withRlsContext({ userId: staff.id, role: getRole(staff) ?? '' }, (tx) =>
    tx.wioaDocumentVersion.findMany({
      where: { documentId },
      orderBy: { uploadedAt: 'desc' },
    }),
  );
  return versions.map((v) => ({
    id: v.id,
    fileName: v.fileName,
    uploadedAt: v.uploadedAt,
    status: v.status as WioaDocumentVersionRecord['status'],
    rejectionReason: v.rejectionReason,
  }));
}

/** Short-lived signed URL for a specific past version, gated the same way as the current file. */
export async function getWioaDocumentVersionUrl(versionId: string): Promise<string> {
  const version = await prisma.wioaDocumentVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: { document: true },
  });
  const staff = await requireMasterCaseAccess(version.document.masterCaseId);
  const rlsVersion = await withRlsContext({ userId: staff.id, role: getRole(staff) ?? '' }, (tx) =>
    tx.wioaDocumentVersion.findUniqueOrThrow({ where: { id: versionId } }),
  );
  return getWioaDocumentSignedUrl(rlsVersion.storagePath);
}

/** Staff document review (spec Section 9/22 — accept, reject, or request resubmission), against
 * the master case's eligibility checklist. Coordinator for any case, Partner Staff only for their
 * assigned case. */
export async function setWioaDocumentStatus(
  documentId: string,
  status: 'ACCEPTED' | 'REJECTED',
  rejectionReason?: string,
): Promise<void> {
  const doc = await prisma.wioaDocument.findUniqueOrThrow({ where: { id: documentId } });
  const staff = await requireMasterCaseAccess(doc.masterCaseId);
  const resolvedRejectionReason =
    status === 'REJECTED' ? rejectionReason?.trim() || 'Resubmission required.' : null;
  if (resolvedRejectionReason && containsSsnPattern(resolvedRejectionReason)) {
    throw new Error('Rejection reason cannot contain a Social Security Number.');
  }

  await withRlsContext({ userId: staff.id, role: getRole(staff) ?? '' }, (tx) =>
    tx.wioaDocument.update({
      where: { id: documentId },
      data: {
        status,
        reviewedBy: staff.id,
        reviewedAt: new Date(),
        rejectionReason: resolvedRejectionReason,
      },
    }),
  );

  await logAuditEvent({
    actor: staff,
    action: 'REVIEW_WIOA_DOCUMENT',
    targetType: 'WioaDocument',
    targetId: documentId,
    metadata: { status },
  });

  revalidatePath('/coordinator');
  revalidatePath('/partner');
}

/** Staff-driven eligibility status transition (master case) — linear, not skippable/reversible
 * except into CLOSED_INELIGIBLE. Optionally creates an ORIENTATION/INTAKE Appointment row in the
 * same action when advancing into an appointment-shaped status. */
/** Expected validation failures are returned, not thrown — Next.js's cacheComponents/PPR
 * resumable-tree reconciliation can swallow a thrown Server Action error on a page whose render
 * shape varies with case data (CLAUDE.local.md #11), replacing it with a useless generic
 * "Minified React error #441" that hides the real message from the Coordinator. Only genuinely
 * unexpected failures (access-control, not-found) still throw. */
export type WioaActionResult = { ok: true } | { ok: false; error: string };

export async function advanceWioaEligibilityStatus(
  masterCaseId: string,
  nextStatus: WioaEligibilityStatus,
  appointment?: { type: AppointmentType; scheduledAt: string; notes?: string },
): Promise<WioaActionResult> {
  const staff = await requireMasterCaseAccess(masterCaseId);

  let fromStatus: string;
  try {
    fromStatus = await withRlsContext(
      { userId: staff.id, role: getRole(staff) ?? '' },
      async (tx) => {
        const current = await tx.wioaCase.findUniqueOrThrow({
          where: { id: masterCaseId },
          include: { documents: { include: { requirement: true } } },
        });
        const allowed = nextEligibilityStatusOptions(current.status);
        if (!allowed.includes(nextStatus)) {
          throw new Error(`Cannot move a case from ${current.status} to ${nextStatus}.`);
        }

        // Backlog gap fix (docs/build/WIOA_BUILD_WORKFLOW.md changelog #1): a case could
        // previously reach WIOA_ELIGIBLE while required documents were still unreviewed or
        // rejected. Gate the one transition where eligibility is actually determined.
        if (nextStatus === 'WIOA_ELIGIBLE') {
          const unresolved = current.documents.filter(
            (d) => d.status !== 'ACCEPTED' && d.status !== 'NOT_APPLICABLE',
          );
          if (unresolved.length > 0) {
            const names = unresolved.map((d) => d.requirement.name).join(', ');
            throw new Error(
              `Cannot mark this case WIOA Eligible — the following documents still need to be accepted: ${names}.`,
            );
          }
        }

        await tx.wioaCase.update({
          where: { id: masterCaseId },
          data: {
            status: nextStatus,
            closedAt: nextStatus === 'CLOSED_INELIGIBLE' ? new Date() : undefined,
          },
        });

        await tx.wioaStatusHistory.create({
          data: { masterCaseId, status: nextStatus, changedBy: staff.id },
        });

        if (appointment) {
          const notes = appointment.notes?.trim() || undefined;
          if (notes && containsSsnPattern(notes)) {
            throw new Error('Appointment notes cannot contain a Social Security Number.');
          }
          await tx.appointment.create({
            data: {
              masterCaseId,
              type: appointment.type,
              scheduledAt: new Date(appointment.scheduledAt),
              notes,
            },
          });
        }

        return current.status;
      },
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not advance this case.',
    };
  }

  await logAuditEvent({
    actor: staff,
    action: 'ADVANCE_WIOA_CASE_STATUS',
    targetType: 'WioaCase',
    targetId: masterCaseId,
    metadata: { from: fromStatus, to: nextStatus },
  });

  revalidatePath('/coordinator');
  revalidatePath('/partner');
  revalidatePath('/learner/funding');
  return { ok: true };
}

/** Staff-driven funding status transition (per course-case) — fires CourseUnlock when funding
 * reaches TUITION_APPROVED (WIOA_INTEGRATION_PLAN.md Section 4, the WIOA module's only write into
 * Enrollment's world). Optionally creates a FOLLOWUP Appointment tagged to this course-case. */
export async function advanceWioaFundingStatus(
  courseCaseId: string,
  nextStatus: WioaFundingStatus,
  appointment?: { scheduledAt: string; notes?: string },
): Promise<void> {
  const staff = await requireCourseCaseAccess(courseCaseId);

  const fromStatus = await withRlsContext(
    { userId: staff.id, role: getRole(staff) ?? '' },
    async (tx) => {
      const current = await tx.wioaCourseCase.findUniqueOrThrow({ where: { id: courseCaseId } });
      const allowed = nextFundingStatusOptions(current.status);
      if (!allowed.includes(nextStatus)) {
        throw new Error(
          `Cannot move this funding request from ${current.status} to ${nextStatus}.`,
        );
      }

      const terminal =
        nextStatus === 'FUNDING_DECLINED' || nextStatus === 'APPRENTICESHIP_ENROLLMENT_COMPLETE';

      await tx.wioaCourseCase.update({
        where: { id: courseCaseId },
        data: { status: nextStatus, closedAt: terminal ? new Date() : undefined },
      });

      await tx.wioaFundingStatusHistory.create({
        data: { courseCaseId, status: nextStatus, changedBy: staff.id },
      });

      if (nextStatus === 'TUITION_APPROVED') {
        const existingUnlock = await tx.courseUnlock.findUnique({
          where: {
            learnerId_courseId: { learnerId: current.learnerId, courseId: current.courseId },
          },
        });
        if (!existingUnlock) {
          await tx.courseUnlock.create({
            data: {
              learnerId: current.learnerId,
              courseId: current.courseId,
              source: 'WIOA_FUNDING',
              grantedBy: staff.id,
            },
          });
        }
      }

      if (appointment) {
        const notes = appointment.notes?.trim() || undefined;
        if (notes && containsSsnPattern(notes)) {
          throw new Error('Appointment notes cannot contain a Social Security Number.');
        }
        await tx.appointment.create({
          data: {
            masterCaseId: current.masterCaseId,
            courseCaseId,
            type: 'FOLLOWUP',
            scheduledAt: new Date(appointment.scheduledAt),
            notes,
          },
        });
      }

      return current.status;
    },
  );

  await logAuditEvent({
    actor: staff,
    action: 'ADVANCE_WIOA_FUNDING_STATUS',
    targetType: 'WioaCourseCase',
    targetId: courseCaseId,
    metadata: { from: fromStatus, to: nextStatus },
  });

  revalidatePath('/coordinator');
  revalidatePath('/partner');
  revalidatePath('/learner/funding');
}

function optionalDate(value?: string): Date | null {
  return value ? new Date(value) : null;
}

export type WioaFundingFields = {
  trainingProgram?: string;
  etplProviderConfirmed: boolean;
  submittedAt?: string;
  caseManagerNotifiedAt?: string;
  /** What NFCAP asked the workforce board for — the "requested" side of Funding Impact
   * Reporting's requested-vs-approved comparison. Independent of FundingAuthorization's
   * approvedAmount, which only ever captures what was granted. */
  requestedAmount?: number;
  fundingReviewStatus?: string;
  requestStatus?: string;
  itaIssuedAt?: string;
  approvedAmount?: number;
  approvalDate?: string;
  trainingStartDate?: string;
  authorizationStatus?: string;
};

/** Funding Approval Sequencing Fix (docs/client/NFCAP_LMS_Feature_Detail_Client.md: "Prevent
 * funding paperwork from being completed earlier in the process than it logically should be").
 * The funding form always resubmits every field's current value, so `fields` alone is the
 * complete picture of what this save would record, and is enough to validate against. */
function validateFundingSequencing(fields: WioaFundingFields): void {
  const submittedAt = optionalDate(fields.submittedAt);
  const itaIssuedAt = optionalDate(fields.itaIssuedAt);
  const approvalDate = optionalDate(fields.approvalDate);
  const trainingStartDate = optionalDate(fields.trainingStartDate);
  const hasAuthorizationData =
    itaIssuedAt != null ||
    fields.approvedAmount != null ||
    approvalDate != null ||
    trainingStartDate != null ||
    !!fields.authorizationStatus?.trim();

  if (hasAuthorizationData && !submittedAt) {
    throw new Error(
      'Record the ETPL funding request as submitted before filling in authorization details.',
    );
  }
  if ((fields.approvedAmount != null || approvalDate) && !itaIssuedAt) {
    throw new Error('Record the ITA issue date before the approved amount or approval date.');
  }
  if (trainingStartDate && !approvalDate) {
    throw new Error('Record the approval date before a training start date.');
  }
  if (itaIssuedAt && submittedAt && itaIssuedAt < submittedAt) {
    throw new Error('ITA issue date cannot be before the request submission date.');
  }
  if (approvalDate && itaIssuedAt && approvalDate < itaIssuedAt) {
    throw new Error('Approval date cannot be before the ITA issue date.');
  }
  if (trainingStartDate && approvalDate && trainingStartDate < approvalDate) {
    throw new Error('Training start date cannot be before the approval date.');
  }
}

/** Coordinator-only (Partner Staff's dashboard excludes funding data entirely, not just its
 * display; this is the write side of that boundary). Upserts the course-case's
 * EtplFundingRequest and its FundingAuthorization together. */
export async function updateWioaFunding(
  courseCaseId: string,
  fields: WioaFundingFields,
): Promise<WioaActionResult> {
  const coordinator = await requireCoordinator();

  try {
    validateFundingSequencing(fields);

    await withRlsContext({ userId: coordinator.id, role: 'WIOA_COORDINATOR' }, async (tx) => {
      const fundingRequest = await tx.etplFundingRequest.upsert({
        where: { wioaCaseId: courseCaseId },
        update: {
          trainingProgram: fields.trainingProgram?.trim() || null,
          etplProviderConfirmed: fields.etplProviderConfirmed,
          submittedAt: optionalDate(fields.submittedAt),
          caseManagerNotifiedAt: optionalDate(fields.caseManagerNotifiedAt),
          requestedAmount: fields.requestedAmount ?? null,
          fundingReviewStatus: fields.fundingReviewStatus?.trim() || null,
          status: fields.requestStatus?.trim() || null,
        },
        create: {
          wioaCaseId: courseCaseId,
          trainingProgram: fields.trainingProgram?.trim() || null,
          etplProviderConfirmed: fields.etplProviderConfirmed,
          submittedAt: optionalDate(fields.submittedAt),
          caseManagerNotifiedAt: optionalDate(fields.caseManagerNotifiedAt),
          requestedAmount: fields.requestedAmount ?? null,
          fundingReviewStatus: fields.fundingReviewStatus?.trim() || null,
          status: fields.requestStatus?.trim() || null,
        },
      });

      await tx.fundingAuthorization.upsert({
        where: { fundingRequestId: fundingRequest.id },
        update: {
          itaIssuedAt: optionalDate(fields.itaIssuedAt),
          approvedAmount: fields.approvedAmount ?? null,
          approvalDate: optionalDate(fields.approvalDate),
          trainingStartDate: optionalDate(fields.trainingStartDate),
          status: fields.authorizationStatus?.trim() || null,
        },
        create: {
          fundingRequestId: fundingRequest.id,
          itaIssuedAt: optionalDate(fields.itaIssuedAt),
          approvedAmount: fields.approvedAmount ?? null,
          approvalDate: optionalDate(fields.approvalDate),
          trainingStartDate: optionalDate(fields.trainingStartDate),
          status: fields.authorizationStatus?.trim() || null,
        },
      });
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not save funding details.',
    };
  }

  revalidatePath('/coordinator');
  revalidatePath(`/coordinator/${courseCaseId}`);
  return { ok: true };
}

/** Admin/Coordinator assigns the learner's master case to a Partner Staff account
 * (WIOA_INTEGRATION_PLAN.md Section 5 — this is what makes PARTNER_STAFF's "assigned students
 * only" scoping real). Pass `null` to unassign. Assignment is purely learner-level
 * (docs/plans/wioa-spec-alignment-kickoff.md #1) — a single write on the master case, no fan-out
 * needed now that funding course-cases don't carry their own copy of it. */
export async function assignWioaCasePartnerStaff(
  masterCaseId: string,
  partnerStaffId: string | null,
): Promise<void> {
  const user = await requireUser();
  const role = getRole(user);
  if (role !== 'ADMIN' && role !== 'WIOA_COORDINATOR') {
    throw new Error('Admin or Coordinator access required.');
  }

  // Previously accepted any id with no check it was even a Partner Staff account, active or not —
  // getPartnerStaffRoster (src/lib/data/learners.ts) already excludes deactivated staff, so this
  // reuses the exact same roster the UI's own dropdown is built from rather than re-deriving it.
  if (partnerStaffId !== null) {
    const roster = await getPartnerStaffRoster();
    if (!roster.some((p) => p.id === partnerStaffId)) {
      throw new Error('That account is not an active Partner Staff member.');
    }
  }

  await withRlsContext({ userId: user.id, role }, (tx) =>
    tx.wioaCase.update({
      where: { id: masterCaseId },
      data: { assignedPartnerStaffId: partnerStaffId },
    }),
  );

  await logAuditEvent({
    actor: user,
    action: 'ASSIGN_WIOA_CASE_PARTNER_STAFF',
    targetType: 'WioaCase',
    targetId: masterCaseId,
    metadata: { partnerStaffId },
  });

  revalidatePath('/coordinator');
  revalidatePath(`/coordinator/${masterCaseId}`);
  revalidatePath('/partner');
}

/** Clears a Partner Staff account's open case assignments — called when they lose the
 * PARTNER_STAFF role (`updateUserRole`, src/lib/actions/roles.ts) or get deactivated
 * (`setUserActive`, src/lib/actions/users.ts). Neither of those actions used to touch WioaCase at
 * all, so a case stayed "Assigned to [someone who can no longer act on it]" indefinitely with
 * nothing surfacing that to the Coordinator. Returns the count so the caller can fold it into its
 * own audit-log entry rather than this writing a second, separate one. `actingAdminId` is the
 * admin making the role/status change, not the Partner Staff account being unassigned — same
 * convention as `assignWioaCasePartnerStaff` passing the real caller into `withRlsContext`. */
export async function unassignPartnerStaffCases(
  actingAdminId: string,
  partnerStaffId: string,
): Promise<number> {
  const { count } = await withRlsContext({ userId: actingAdminId, role: 'ADMIN' }, (tx) =>
    tx.wioaCase.updateMany({
      where: { assignedPartnerStaffId: partnerStaffId },
      data: { assignedPartnerStaffId: null },
    }),
  );
  if (count > 0) {
    revalidatePath('/coordinator');
    revalidatePath('/partner');
  }
  return count;
}

/** Partner Staff/Coordinator follow-up note on a learner's case (PTN02-LearnerDetail's "Add a
 * note") — logged as a WioaCommunication with the NOTE channel against the master case, which
 * `getWioaCommunications` explicitly excludes from the learner's own Funding-page outreach log.
 * `recipient` is a fixed placeholder, not a real address — nothing is sent. */
export async function addWioaCaseNote(masterCaseId: string, body: string): Promise<void> {
  const user = await requireMasterCaseAccess(masterCaseId);
  const role = getRole(user) ?? 'PARTNER_STAFF';
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Note cannot be empty.');
  if (trimmed.length > 2000) throw new Error('Note is too long.');

  await withRlsContext({ userId: user.id, role }, async (tx) => {
    const masterCase = await tx.wioaCase.findUniqueOrThrow({
      where: { id: masterCaseId },
      select: { learnerId: true },
    });
    await tx.wioaCommunication.create({
      data: {
        learnerId: masterCase.learnerId,
        masterCaseId,
        channel: 'NOTE',
        recipient: 'internal note',
        body: trimmed,
      },
    });
  });

  revalidatePath('/partner');
  revalidatePath(`/partner/${masterCaseId}`);
  revalidatePath('/coordinator');
  revalidatePath(`/coordinator/${masterCaseId}`);
}

/** Sends a real reminder email (src/lib/email.ts — Resend) listing the master case's
 * missing/rejected eligibility documents, and logs it the same way sendWioaOutreach does. Known
 * limitation carried over from Phase 2 (docs/build/PHASE_2_PROGRESS.md): no sending domain is
 * verified in Resend yet, so delivery only actually reaches Resend's own verified test address
 * until that's resolved — sendEmail() still runs for real and the WioaCommunication log entry is
 * real either way. */
export async function sendWioaCaseReminder(masterCaseId: string): Promise<void> {
  const user = await requireMasterCaseAccess(masterCaseId);
  const role = getRole(user) ?? 'PARTNER_STAFF';
  await enforceRateLimit(user.id, 'wioa-case-reminder', 20, 15 * 60 * 1000);

  const { learnerId, missingDocumentNames } = await withRlsContext(
    { userId: user.id, role },
    async (tx) => {
      const masterCase = await tx.wioaCase.findUniqueOrThrow({
        where: { id: masterCaseId },
        include: { documents: { include: { requirement: true } } },
      });
      return {
        learnerId: masterCase.learnerId,
        missingDocumentNames: masterCase.documents
          .filter((d) => d.status === 'MISSING' || d.status === 'REJECTED')
          .map((d) => d.requirement.name),
      };
    },
  );

  // Supabase Auth Admin API call — must happen outside the RLS transaction above (CLAUDE.md
  // performance conventions: never hold a pooler slot across a network call).
  const learner = await getLearnerById(learnerId);
  if (!learner?.email) throw new Error('Learner has no email on file.');

  const subject = `Reminder: documents needed for your WIOA case`;
  const list =
    missingDocumentNames.length > 0
      ? `<ul>${missingDocumentNames.map((name) => `<li>${name}</li>`).join('')}</ul>`
      : '<p>Please check your document checklist for anything still outstanding.</p>';
  const html = `<p>Hi ${learner.name || 'there'},</p><p>This is a reminder that the following document(s) are still needed for your WIOA eligibility case:</p>${list}<p>Thanks,<br/>NFCAP</p>`;

  // Spec Section 19 (docs/plans/wioa-spec-alignment-kickoff.md #7) — same fix as sendWioaOutreach:
  // a failed send gets its own logged row instead of vanishing.
  let failureReason: string | null = null;
  try {
    await sendEmail({ to: learner.email, subject, html });
  } catch (err) {
    failureReason = err instanceof Error ? err.message : 'Unknown error';
  }

  await withRlsContext({ userId: user.id, role }, (tx) =>
    tx.wioaCommunication.create({
      data: {
        learnerId,
        masterCaseId,
        channel: 'EMAIL',
        recipient: learner.email,
        subject,
        body: html,
        status: failureReason ? 'FAILED' : 'SENT',
        failureReason,
      },
    }),
  );

  revalidatePath('/partner');
  revalidatePath(`/partner/${masterCaseId}`);
  revalidatePath('/coordinator');
  revalidatePath(`/coordinator/${masterCaseId}`);

  if (failureReason) {
    throw new Error('Could not send this reminder email. Please try again.');
  }
}
