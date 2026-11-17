'use server';

import { revalidatePath } from 'next/cache';
import type { User } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import type { WioaCaseStatus, AppointmentType, WioaDocumentStatus } from '@/generated/prisma/enums';
import { requireUser, requireCoordinator } from './guard';
import { getRole } from '@/lib/supabase/server';
import { matchWorkforceOffice } from '@/lib/wioa/matching';
import { shouldRequireEdd, EDD_REQUIREMENT_NAME } from '@/lib/wioa/documents';
import { nextStatusOptions } from '@/lib/wioa/status';
import { uploadWioaDocumentFile, getWioaDocumentSignedUrl } from '@/lib/supabase/wioa-storage';
import { logAuditEvent } from './audit';
import { containsSsnPattern } from '@/lib/pii';
import { enforceRateLimit } from '@/lib/rate-limit';
import { withRlsContext } from '@/lib/db/rls';
import type { PrismaClient } from '@/generated/prisma/client';

/** Case-level authorization for staff actions (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — every
 * transition is staff-driven: Coordinator for any case, Partner Staff only for their assigned
 * cases). Retires Phase 2's requireAdmin gate on these actions now that the real roles exist.
 *
 * Deliberately stays on the plain `prisma` client rather than `withRlsContext`
 * (docs/build/PHASE_1_PROGRESS.md) — this lookup's only job is deciding access, not returning
 * data to the caller, and `tests/unit/wioa-status.test.ts` pins the exact "Not your assigned
 * case." message an unassigned Partner Staff member gets. Routing this fetch through RLS would
 * make the row disappear instead of being found-but-rejected, collapsing that message into a
 * generic not-found error. Every actual data read/write below this check uses `withRlsContext`,
 * so RLS still backs the real security boundary even though this one gate read doesn't. */
async function requireCaseAccess(caseId: string): Promise<User> {
  const user = await requireUser();
  const role = getRole(user);
  if (role === 'WIOA_COORDINATOR') return user;
  if (role === 'PARTNER_STAFF') {
    const wioaCase = await prisma.wioaCase.findUniqueOrThrow({ where: { id: caseId } });
    if (wioaCase.assignedPartnerStaffId !== user.id) {
      throw new Error('Not your assigned case.');
    }
    return user;
  }
  throw new Error('Coordinator or Partner Staff access required.');
}

function orNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? '').trim();
  return str.length > 0 ? str : null;
}

/** Lets an existing account (signed up before this module existed, or one that skipped the
 * WIOA section at signup) enter matching details later from the Funding page — the plan's
 * "editable later from Profile or the Funding area" note (WIOA_INTEGRATION_PLAN.md Section 5). */
export async function updateWioaProfile(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateOfBirth = String(formData.get('dateOfBirth') ?? '');

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

/** Creates the case's document checklist — one WioaDocument (MISSING) per requirement scoped to
 * the matched board, skipping the EDD Award Letter unless the learner's profile indicates recent
 * UI activity (the one conditional rule this prototype needs — see src/lib/wioa/documents.ts).
 * Takes the caller's RLS transaction client — WioaDocument is RLS-scoped
 * (prisma/migrations/20261105120000_add_rls_wioa_pii), WioaDocumentRequirement isn't, but reading
 * it through the same `tx` is harmless (app_runtime has SELECT on every table; RLS only applies
 * where a policy exists) and avoids a second connection mid-transaction. */
async function createCaseDocumentChecklist(
  tx: PrismaClient,
  wioaCaseId: string,
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
      wioaCaseId,
      requirementId: r.id,
      status: 'MISSING' as const,
    })),
  });
}

/** Confirm-send action for the WIOA outreach email (WIOA_INTEGRATION_PLAN.md Section 6/11) —
 * generates, lets the student edit, then logs. First send for a course also creates the WioaCase
 * (spec Section 3 step 6 — "Create a WIOA case automatically when outreach is sent") and, when
 * matched to a board, that board's document checklist. A second send against an already-open
 * case just logs another communication row against it. */
export async function sendWioaOutreach(
  courseSlug: string,
  contactId: string | null,
  recipient: string,
  subject: string,
  body: string,
): Promise<void> {
  const user = await requireUser();
  const role = getRole(user) ?? 'LEARNER';
  // Course isn't RLS-scoped — fine to read on the plain client ahead of the RLS transaction.
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: courseSlug },
    select: { id: true },
  });

  // WioaCase/WioaStatusHistory/WioaDocument/LearnerProfile/WioaCommunication are all RLS-scoped
  // (prisma/migrations/20261105120000_add_rls_wioa_pii) — one RLS transaction for the whole
  // read-then-maybe-create-case-then-log flow, which also makes the case-creation steps atomic
  // (they weren't before this rewrite).
  await withRlsContext({ userId: user.id, role }, async (tx) => {
    let wioaCase = await tx.wioaCase.findFirst({
      where: { learnerId: user.id, courseId: course.id, closedAt: null },
    });

    if (!wioaCase) {
      const profile = await tx.learnerProfile.findUnique({ where: { learnerId: user.id } });
      const match = profile?.zip ? await matchWorkforceOffice(profile.zip) : null;

      wioaCase = await tx.wioaCase.create({
        data: {
          learnerId: user.id,
          courseId: course.id,
          workforceBoardId: match?.board.id,
          ajccCenterId: match?.ajcc?.id,
          contactId: match?.contact?.id ?? contactId ?? undefined,
          status: 'INITIAL_CONTACT_SENT',
        },
      });

      await tx.wioaStatusHistory.create({
        data: { wioaCaseId: wioaCase.id, status: 'INITIAL_CONTACT_SENT', changedBy: user.id },
      });

      if (match?.board.id) {
        await createCaseDocumentChecklist(
          tx,
          wioaCase.id,
          match.board.id,
          profile?.unemploymentInsuranceStatus ?? null,
        );
      }
    }

    await tx.wioaCommunication.create({
      data: {
        learnerId: user.id,
        courseId: course.id,
        wioaCaseId: wioaCase.id,
        contactId: contactId ?? undefined,
        channel: 'EMAIL',
        recipient,
        subject,
        body,
      },
    });
  });

  revalidatePath('/learner/funding');
}

/** Learner document upload (spec Section 9). Verifies the case belongs to the caller before
 * touching Storage or the DB — a server action can be invoked directly, so ownership can't be
 * assumed from what the UI shows. */
export async function uploadWioaDocument(documentId: string, file: File): Promise<void> {
  const user = await requireUser();
  await enforceRateLimit(user.id, 'wioa-document-upload', 20, 15 * 60 * 1000);

  // Ownership-check read only, same deliberate trade-off as requireCaseAccess above — stays on
  // the plain `prisma` client so a non-owner gets this function's explicit "Not your document."
  // instead of a generic not-found from RLS. The writes below use `withRlsContext`.
  const doc = await prisma.wioaDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: { wioaCase: true },
  });
  if (doc.wioaCase.learnerId !== user.id) {
    throw new Error('Not your document.');
  }

  // Each upload gets its own storage object — never overwritten or deleted — so a superseded
  // file (e.g. one later rejected) stays retrievable via its WioaDocumentVersion snapshot below.
  // Uploaded before the RLS transaction opens (CLAUDE.md performance conventions — never hold a
  // pooler slot across a Storage call).
  const path = `${user.id}/${doc.wioaCaseId}/${doc.requirementId}/${Date.now()}-${file.name}`;
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
    // transition is staff-driven" (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions"). Folded
    // into this same transaction now (it wasn't before this rewrite), closing a race where a
    // concurrent upload of the last remaining document could double-fire this transition.
    if (doc.wioaCase.status === 'DOCUMENTS_PENDING') {
      const remaining = await tx.wioaDocument.count({
        where: { wioaCaseId: doc.wioaCaseId, status: 'MISSING' },
      });
      if (remaining === 0) {
        await tx.wioaCase.update({
          where: { id: doc.wioaCaseId },
          data: { status: 'DOCUMENTS_SUBMITTED' },
        });
        await tx.wioaStatusHistory.create({
          data: { wioaCaseId: doc.wioaCaseId, status: 'DOCUMENTS_SUBMITTED', changedBy: user.id },
        });
      }
    }
  });

  revalidatePath('/learner/funding');
}

/** Short-lived signed URL for staff to view an uploaded document (WIOA_INTEGRATION_PLAN.md
 * Section 10 — never a public URL). Gated by requireCaseAccess since the storage path alone
 * carries no access control. */
export async function getWioaDocumentUrl(documentId: string): Promise<string> {
  // Ownership-check read on the plain client, same trade-off as requireCaseAccess above.
  const doc = await prisma.wioaDocument.findUniqueOrThrow({ where: { id: documentId } });
  const staff = await requireCaseAccess(doc.wioaCaseId);
  // Re-read through RLS now that access is confirmed, so the storage path actually returned to
  // the caller comes from the RLS-gated client rather than the bypass read above (which exists
  // only to learn the case id for requireCaseAccess).
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
  const staff = await requireCaseAccess(doc.wioaCaseId);

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
  const staff = await requireCaseAccess(version.document.wioaCaseId);
  const rlsVersion = await withRlsContext({ userId: staff.id, role: getRole(staff) ?? '' }, (tx) =>
    tx.wioaDocumentVersion.findUniqueOrThrow({ where: { id: versionId } }),
  );
  return getWioaDocumentSignedUrl(rlsVersion.storagePath);
}

/** Staff document review (spec Section 9/22 — accept, reject, or request resubmission), mirrors
 * setEvidenceStatus's shape (src/lib/actions/progress.ts). Coordinator for any case, Partner
 * Staff only for their assigned case (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — replaces the Phase 2
 * requireAdmin/admin-only placement). */
export async function setWioaDocumentStatus(
  documentId: string,
  status: 'ACCEPTED' | 'REJECTED',
  rejectionReason?: string,
): Promise<void> {
  const doc = await prisma.wioaDocument.findUniqueOrThrow({ where: { id: documentId } });
  const staff = await requireCaseAccess(doc.wioaCaseId);
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

/** Staff-driven status transition (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions" — linear, not
 * skippable/reversible except into CLOSED_INELIGIBLE). Optionally creates the Appointment row in
 * the same action when advancing into an appointment-shaped status — Appointment is
 * authoritative for schedule data, the status is a derived label set alongside it, not by it. */
export async function advanceWioaCaseStatus(
  caseId: string,
  nextStatus: WioaCaseStatus,
  appointment?: { type: AppointmentType; scheduledAt: string; notes?: string },
): Promise<void> {
  const staff = await requireCaseAccess(caseId);

  // The read of `current` happens after requireCaseAccess already confirmed access (unlike the
  // getter functions above), so there's no ordering conflict in putting the whole
  // read-validate-write flow for this RLS-scoped case inside one RLS transaction.
  const fromStatus = await withRlsContext(
    { userId: staff.id, role: getRole(staff) ?? '' },
    async (tx) => {
      const current = await tx.wioaCase.findUniqueOrThrow({
        where: { id: caseId },
        include: { documents: { include: { requirement: true } } },
      });
      const allowed = nextStatusOptions(current.status);
      if (!allowed.includes(nextStatus)) {
        throw new Error(`Cannot move a case from ${current.status} to ${nextStatus}.`);
      }

      // Backlog gap fix (docs/build/WIOA_BUILD_WORKFLOW.md changelog #1): a case could previously
      // reach WIOA_ELIGIBLE — and everything downstream of it, including the TUITION_APPROVED
      // CourseUnlock trigger — while required documents were still unreviewed or rejected. Gate
      // the one transition where eligibility is actually determined; every later status is
      // unreachable without passing through this one, so this single check protects the whole
      // rest of the chain.
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

      const terminal =
        nextStatus === 'CLOSED_INELIGIBLE' || nextStatus === 'APPRENTICESHIP_ENROLLMENT_COMPLETE';

      await tx.wioaCase.update({
        where: { id: caseId },
        data: { status: nextStatus, closedAt: terminal ? new Date() : undefined },
      });

      await tx.wioaStatusHistory.create({
        data: { wioaCaseId: caseId, status: nextStatus, changedBy: staff.id },
      });

      // WIOA_INTEGRATION_PLAN.md Section 4 — the WIOA module's only write into Enrollment's
      // world. Reaching Tuition Approved unlocks the case's course; preserves an existing unlock
      // (e.g. an earlier ADMIN_ASSIGNMENT grant) instead of overwriting its source. CourseUnlock
      // isn't RLS-scoped, but reading/writing it through `tx` is harmless (app_runtime has
      // grants on every table) and keeps this one unlock write atomic with the status change.
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
            wioaCaseId: caseId,
            type: appointment.type,
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
    action: 'ADVANCE_WIOA_CASE_STATUS',
    targetType: 'WioaCase',
    targetId: caseId,
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
  fundingReviewStatus?: string;
  requestStatus?: string;
  itaIssuedAt?: string;
  approvedAmount?: number;
  approvalDate?: string;
  trainingStartDate?: string;
  authorizationStatus?: string;
};

/** Coordinator-only (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — Partner Staff's dashboard excludes
 * funding data entirely, not just its display; this is the write side of that boundary).
 * Upserts the case's EtplFundingRequest and its FundingAuthorization together — the Coordinator
 * fills the 8 milestones in incrementally from one form rather than two separate ones. */
export async function updateWioaFunding(caseId: string, fields: WioaFundingFields): Promise<void> {
  const coordinator = await requireCoordinator();

  await withRlsContext({ userId: coordinator.id, role: 'WIOA_COORDINATOR' }, async (tx) => {
    const fundingRequest = await tx.etplFundingRequest.upsert({
      where: { wioaCaseId: caseId },
      update: {
        trainingProgram: fields.trainingProgram?.trim() || null,
        etplProviderConfirmed: fields.etplProviderConfirmed,
        submittedAt: optionalDate(fields.submittedAt),
        caseManagerNotifiedAt: optionalDate(fields.caseManagerNotifiedAt),
        fundingReviewStatus: fields.fundingReviewStatus?.trim() || null,
        status: fields.requestStatus?.trim() || null,
      },
      create: {
        wioaCaseId: caseId,
        trainingProgram: fields.trainingProgram?.trim() || null,
        etplProviderConfirmed: fields.etplProviderConfirmed,
        submittedAt: optionalDate(fields.submittedAt),
        caseManagerNotifiedAt: optionalDate(fields.caseManagerNotifiedAt),
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

  revalidatePath('/coordinator');
  revalidatePath(`/coordinator/${caseId}`);
}

/** Admin/Coordinator assigns a case to a Partner Staff account (WIOA_INTEGRATION_PLAN.md
 * Section 5 — this is what makes PARTNER_STAFF's "assigned students only" scoping real). Pass
 * `null` to unassign. Lives on the Coordinator dashboard's WIOA Cases view
 * (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3). */
export async function assignWioaCasePartnerStaff(
  caseId: string,
  partnerStaffId: string | null,
): Promise<void> {
  const user = await requireUser();
  const role = getRole(user);
  if (role !== 'ADMIN' && role !== 'WIOA_COORDINATOR') {
    throw new Error('Admin or Coordinator access required.');
  }

  await withRlsContext({ userId: user.id, role }, (tx) =>
    tx.wioaCase.update({
      where: { id: caseId },
      data: { assignedPartnerStaffId: partnerStaffId },
    }),
  );

  await logAuditEvent({
    actor: user,
    action: 'ASSIGN_WIOA_CASE_PARTNER_STAFF',
    targetType: 'WioaCase',
    targetId: caseId,
    metadata: { partnerStaffId },
  });

  revalidatePath('/coordinator');
  revalidatePath(`/coordinator/${caseId}`);
  revalidatePath('/partner');
}
