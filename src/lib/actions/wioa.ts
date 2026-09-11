'use server';

import { revalidatePath } from 'next/cache';
import type { User } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import type { WioaCaseStatus, AppointmentType } from '@/generated/prisma/enums';
import { requireUser, requireCoordinator } from './guard';
import { getRole } from '@/lib/supabase/server';
import { matchWorkforceOffice } from '@/lib/wioa/matching';
import { shouldRequireEdd, EDD_REQUIREMENT_NAME } from '@/lib/wioa/documents';
import { nextStatusOptions } from '@/lib/wioa/status';
import { uploadWioaDocumentFile, getWioaDocumentSignedUrl } from '@/lib/supabase/wioa-storage';

/** Case-level authorization for staff actions (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — every
 * transition is staff-driven: Coordinator for any case, Partner Staff only for their assigned
 * cases). Retires Phase 2's requireAdmin gate on these actions now that the real roles exist. */
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

  await prisma.learnerProfile.upsert({
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
  });

  revalidatePath('/learner/funding');
}

/** Creates the case's document checklist — one WioaDocument (MISSING) per requirement scoped to
 * the matched board, skipping the EDD Award Letter unless the learner's profile indicates recent
 * UI activity (the one conditional rule this prototype needs — see src/lib/wioa/documents.ts). */
async function createCaseDocumentChecklist(
  wioaCaseId: string,
  workforceBoardId: string,
  unemploymentInsuranceStatus: string | null,
): Promise<void> {
  const requirements = await prisma.wioaDocumentRequirement.findMany({
    where: { workforceBoardId },
  });
  const applicable = requirements.filter(
    (r) =>
      !r.conditional ||
      (r.name === EDD_REQUIREMENT_NAME && shouldRequireEdd(unemploymentInsuranceStatus)),
  );
  if (applicable.length === 0) return;

  await prisma.wioaDocument.createMany({
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
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: courseSlug },
    select: { id: true },
  });

  let wioaCase = await prisma.wioaCase.findFirst({
    where: { learnerId: user.id, courseId: course.id, closedAt: null },
  });

  if (!wioaCase) {
    const profile = await prisma.learnerProfile.findUnique({ where: { learnerId: user.id } });
    const match = profile?.zip ? await matchWorkforceOffice(profile.zip) : null;

    wioaCase = await prisma.wioaCase.create({
      data: {
        learnerId: user.id,
        courseId: course.id,
        workforceBoardId: match?.board.id,
        ajccCenterId: match?.ajcc?.id,
        contactId: match?.contact?.id ?? contactId ?? undefined,
        status: 'INITIAL_CONTACT_SENT',
      },
    });

    await prisma.wioaStatusHistory.create({
      data: { wioaCaseId: wioaCase.id, status: 'INITIAL_CONTACT_SENT', changedBy: user.id },
    });

    if (match?.board.id) {
      await createCaseDocumentChecklist(
        wioaCase.id,
        match.board.id,
        profile?.unemploymentInsuranceStatus ?? null,
      );
    }
  }

  await prisma.wioaCommunication.create({
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

  revalidatePath('/learner/funding');
}

/** Learner document upload (spec Section 9). Verifies the case belongs to the caller before
 * touching Storage or the DB — a server action can be invoked directly, so ownership can't be
 * assumed from what the UI shows. */
export async function uploadWioaDocument(documentId: string, file: File): Promise<void> {
  const user = await requireUser();

  const doc = await prisma.wioaDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: { wioaCase: true },
  });
  if (doc.wioaCase.learnerId !== user.id) {
    throw new Error('Not your document.');
  }

  const path = `${user.id}/${doc.wioaCaseId}/${doc.requirementId}/${file.name}`;
  await uploadWioaDocumentFile(path, file);

  await prisma.wioaDocument.update({
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

  // Spec Section 9: "When all applicable documents are uploaded, change the case from Documents
  // Pending to Documents Submitted." Learner-triggered, the one exception to "every transition is
  // staff-driven" (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions").
  if (doc.wioaCase.status === 'DOCUMENTS_PENDING') {
    const remaining = await prisma.wioaDocument.count({
      where: { wioaCaseId: doc.wioaCaseId, status: 'MISSING' },
    });
    if (remaining === 0) {
      await prisma.wioaCase.update({
        where: { id: doc.wioaCaseId },
        data: { status: 'DOCUMENTS_SUBMITTED' },
      });
      await prisma.wioaStatusHistory.create({
        data: { wioaCaseId: doc.wioaCaseId, status: 'DOCUMENTS_SUBMITTED', changedBy: user.id },
      });
    }
  }

  revalidatePath('/learner/funding');
}

/** Short-lived signed URL for staff to view an uploaded document (WIOA_INTEGRATION_PLAN.md
 * Section 10 — never a public URL). Gated by requireCaseAccess since the storage path alone
 * carries no access control. */
export async function getWioaDocumentUrl(documentId: string): Promise<string> {
  const doc = await prisma.wioaDocument.findUniqueOrThrow({ where: { id: documentId } });
  await requireCaseAccess(doc.wioaCaseId);
  if (!doc.storagePath) throw new Error('No file uploaded for this document.');
  return getWioaDocumentSignedUrl(doc.storagePath);
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

  await prisma.wioaDocument.update({
    where: { id: documentId },
    data: {
      status,
      reviewedBy: staff.id,
      reviewedAt: new Date(),
      rejectionReason:
        status === 'REJECTED' ? rejectionReason?.trim() || 'Resubmission required.' : null,
    },
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

  const current = await prisma.wioaCase.findUniqueOrThrow({
    where: { id: caseId },
    include: { documents: { include: { requirement: true } } },
  });
  const allowed = nextStatusOptions(current.status);
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot move a case from ${current.status} to ${nextStatus}.`);
  }

  // Backlog gap fix (docs/build/WIOA_BUILD_WORKFLOW.md changelog #1): a case could previously
  // reach WIOA_ELIGIBLE — and everything downstream of it, including the TUITION_APPROVED
  // CourseUnlock trigger — while required documents were still unreviewed or rejected. Gate the
  // one transition where eligibility is actually determined; every later status is unreachable
  // without passing through this one, so this single check protects the whole rest of the chain.
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

  await prisma.wioaCase.update({
    where: { id: caseId },
    data: { status: nextStatus, closedAt: terminal ? new Date() : undefined },
  });

  await prisma.wioaStatusHistory.create({
    data: { wioaCaseId: caseId, status: nextStatus, changedBy: staff.id },
  });

  // WIOA_INTEGRATION_PLAN.md Section 4 — the WIOA module's only write into Enrollment's world.
  // Reaching Tuition Approved unlocks the case's course; preserves an existing unlock (e.g. an
  // earlier ADMIN_ASSIGNMENT grant) instead of overwriting its source.
  if (nextStatus === 'TUITION_APPROVED') {
    const existingUnlock = await prisma.courseUnlock.findUnique({
      where: { learnerId_courseId: { learnerId: current.learnerId, courseId: current.courseId } },
    });
    if (!existingUnlock) {
      await prisma.courseUnlock.create({
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
    await prisma.appointment.create({
      data: {
        wioaCaseId: caseId,
        type: appointment.type,
        scheduledAt: new Date(appointment.scheduledAt),
        notes: appointment.notes?.trim() || undefined,
      },
    });
  }

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
  await requireCoordinator();

  const fundingRequest = await prisma.etplFundingRequest.upsert({
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

  await prisma.fundingAuthorization.upsert({
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

  await prisma.wioaCase.update({
    where: { id: caseId },
    data: { assignedPartnerStaffId: partnerStaffId },
  });

  revalidatePath('/coordinator');
  revalidatePath(`/coordinator/${caseId}`);
  revalidatePath('/partner');
}
