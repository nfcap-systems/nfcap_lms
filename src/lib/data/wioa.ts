import { prisma } from '@/lib/prisma';
import { getLearnerById } from '@/lib/data/learners';
import type { WioaCaseStatus, WioaDocumentStatus, AppointmentType } from '@/generated/prisma/enums';
import { WIOA_STATUS_PHASE, WIOA_UI_PHASES, type WioaUiPhase } from '@/lib/wioa/status';

export type LearnerProfile = {
  learnerId: string;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  preferredLanguage: string | null;
  employmentStatus: string | null;
  unemploymentInsuranceStatus: string | null;
  trainingApprenticeshipInterest: string | null;
  fundingSource: 'SELF_PAY' | 'WIOA_PENDING';
  dateOfBirth: Date | null;
  mobilePhone: string | null;
};

export async function getLearnerProfile(learnerId: string): Promise<LearnerProfile | null> {
  return prisma.learnerProfile.findUnique({ where: { learnerId } });
}

export type WioaCommunicationRecord = {
  id: string;
  courseId: string;
  channel: 'EMAIL' | 'CALL';
  recipient: string;
  subject: string | null;
  body: string | null;
  sentAt: Date;
};

export async function getWioaCommunications(learnerId: string): Promise<WioaCommunicationRecord[]> {
  return prisma.wioaCommunication.findMany({
    where: { learnerId },
    orderBy: { sentAt: 'desc' },
  });
}

export type WioaDocumentRecord = {
  id: string;
  requirementId: string;
  requirementName: string;
  requirementDescription: string;
  fileName: string | null;
  status: WioaDocumentStatus;
  uploadedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
};

export type WioaAppointmentRecord = {
  id: string;
  type: AppointmentType;
  scheduledAt: Date;
  completedAt: Date | null;
  notes: string | null;
};

export type WioaCaseRecord = {
  id: string;
  /** The course's readable slug (matching `getAllCourses()`'s `id`), not the Prisma cuid — this
   * is what the learner Funding view keys its active-case lookup on. */
  courseId: string;
  courseTitle: string;
  status: WioaCaseStatus;
  createdAt: Date;
  closedAt: Date | null;
  boardName: string | null;
  ajccName: string | null;
  contactName: string | null;
  documents: WioaDocumentRecord[];
  appointments: WioaAppointmentRecord[];
};

/** Every WIOA case for a learner, one per restricted course they've started outreach for
 * (WIOA_INTEGRATION_PLAN.md Section 5 — case scope is per learner per course). Feeds the
 * learner-facing consolidated activity feed (Section 7). */
export async function getWioaCasesForLearner(learnerId: string): Promise<WioaCaseRecord[]> {
  const cases = await prisma.wioaCase.findMany({
    where: { learnerId },
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { slug: true, title: true } },
      workforceBoard: { select: { name: true } },
      ajccCenter: { select: { name: true } },
      contact: { select: { name: true } },
      documents: { include: { requirement: true } },
      appointments: { orderBy: { scheduledAt: 'asc' } },
    },
  });

  return cases.map((c) => ({
    id: c.id,
    courseId: c.course.slug,
    courseTitle: c.course.title,
    status: c.status,
    createdAt: c.createdAt,
    closedAt: c.closedAt,
    boardName: c.workforceBoard?.name ?? null,
    ajccName: c.ajccCenter?.name ?? null,
    contactName: c.contact?.name ?? null,
    documents: c.documents.map((d) => ({
      id: d.id,
      requirementId: d.requirementId,
      requirementName: d.requirement.name,
      requirementDescription: d.requirement.description,
      fileName: d.fileName,
      status: d.status,
      uploadedAt: d.uploadedAt,
      reviewedAt: d.reviewedAt,
      rejectionReason: d.rejectionReason,
    })),
    appointments: c.appointments,
  }));
}

export async function getWioaCaseForLearnerAndCourse(
  learnerId: string,
  courseId: string,
): Promise<WioaCaseRecord | null> {
  const cases = await getWioaCasesForLearner(learnerId);
  return cases.find((c) => c.courseId === courseId && !c.closedAt) ?? null;
}

export type WioaCaseSummary = {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  status: WioaCaseStatus;
  boardName: string | null;
  createdAt: Date;
  pendingDocumentCount: number;
  assignedPartnerStaffId: string | null;
  assignedPartnerStaffName: string | null;
};

/** Staff case list — every case by default (Coordinator), or filtered to one Partner Staff
 * account's assigned cases (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — replaces the Phase 2
 * /admin/wioa stepping stone's getAllWioaCases). No pagination — prototype scale, same
 * assumption getLearnerRoster already makes. */
export async function getWioaCases(opts?: {
  assignedPartnerStaffId?: string;
}): Promise<WioaCaseSummary[]> {
  const cases = await prisma.wioaCase.findMany({
    where: opts?.assignedPartnerStaffId
      ? { assignedPartnerStaffId: opts.assignedPartnerStaffId }
      : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { title: true } },
      workforceBoard: { select: { name: true } },
      documents: { select: { status: true } },
    },
  });

  const users = new Map<string, { name: string; email: string }>();
  async function nameOf(userId: string): Promise<{ name: string; email: string }> {
    if (!users.has(userId)) {
      const user = await getLearnerById(userId);
      users.set(userId, { name: user?.name ?? 'Unknown', email: user?.email ?? '' });
    }
    return users.get(userId)!;
  }

  const result: WioaCaseSummary[] = [];
  for (const c of cases) {
    const learner = await nameOf(c.learnerId);
    const partnerStaff = c.assignedPartnerStaffId ? await nameOf(c.assignedPartnerStaffId) : null;
    result.push({
      id: c.id,
      learnerId: c.learnerId,
      learnerName: learner.name,
      learnerEmail: learner.email,
      courseTitle: c.course.title,
      status: c.status,
      boardName: c.workforceBoard?.name ?? null,
      createdAt: c.createdAt,
      pendingDocumentCount: c.documents.filter(
        (d) => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW',
      ).length,
      assignedPartnerStaffId: c.assignedPartnerStaffId,
      assignedPartnerStaffName: partnerStaff?.name ?? null,
    });
  }
  return result;
}

export type WioaFundingRecord = {
  id: string;
  trainingProgram: string | null;
  etplProviderConfirmed: boolean;
  submittedAt: Date | null;
  caseManagerNotifiedAt: Date | null;
  fundingReviewStatus: string | null;
  status: string | null;
  authorization: {
    id: string;
    itaIssuedAt: Date | null;
    approvedAmount: number | null;
    approvalDate: Date | null;
    trainingStartDate: Date | null;
    status: string | null;
  } | null;
};

export type WioaCaseDetail = WioaCaseRecord & {
  learnerName: string;
  learnerEmail: string;
  assignedPartnerStaffId: string | null;
  assignedPartnerStaffName: string | null;
  statusHistory: { id: string; status: WioaCaseStatus; changedAt: Date; changedBy: string }[];
  communications: WioaCommunicationRecord[];
  /** Only populated when `includeFunding` is passed (Coordinator dashboard) — Partner Staff's
   * fetch never requests it, so funding data never reaches the client bundle for that role
   * (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — "excludes funding data entirely", not just display). */
  funding?: WioaFundingRecord | null;
};

export async function getWioaCaseDetail(
  caseId: string,
  opts?: { includeFunding?: boolean },
): Promise<WioaCaseDetail | null> {
  const c = await prisma.wioaCase.findUnique({
    where: { id: caseId },
    include: {
      course: { select: { slug: true, title: true } },
      workforceBoard: { select: { name: true } },
      ajccCenter: { select: { name: true } },
      contact: { select: { name: true } },
      documents: { include: { requirement: true } },
      appointments: { orderBy: { scheduledAt: 'asc' } },
      statusHistory: { orderBy: { changedAt: 'asc' } },
      communications: { orderBy: { sentAt: 'desc' } },
      fundingRequest: { include: { authorization: true } },
    },
  });
  if (!c) return null;

  const learner = await getLearnerById(c.learnerId);
  const partnerStaff = c.assignedPartnerStaffId
    ? await getLearnerById(c.assignedPartnerStaffId)
    : undefined;

  return {
    id: c.id,
    courseId: c.course.slug,
    courseTitle: c.course.title,
    status: c.status,
    createdAt: c.createdAt,
    closedAt: c.closedAt,
    boardName: c.workforceBoard?.name ?? null,
    ajccName: c.ajccCenter?.name ?? null,
    contactName: c.contact?.name ?? null,
    learnerName: learner?.name ?? 'Unknown',
    learnerEmail: learner?.email ?? '',
    assignedPartnerStaffId: c.assignedPartnerStaffId,
    assignedPartnerStaffName: partnerStaff?.name ?? null,
    documents: c.documents.map((d) => ({
      id: d.id,
      requirementId: d.requirementId,
      requirementName: d.requirement.name,
      requirementDescription: d.requirement.description,
      fileName: d.fileName,
      status: d.status,
      uploadedAt: d.uploadedAt,
      reviewedAt: d.reviewedAt,
      rejectionReason: d.rejectionReason,
    })),
    appointments: c.appointments,
    statusHistory: c.statusHistory,
    communications: c.communications.map((comm) => ({
      id: comm.id,
      courseId: comm.courseId,
      channel: comm.channel,
      recipient: comm.recipient,
      subject: comm.subject,
      body: comm.body,
      sentAt: comm.sentAt,
    })),
    funding: opts?.includeFunding
      ? c.fundingRequest
        ? {
            id: c.fundingRequest.id,
            trainingProgram: c.fundingRequest.trainingProgram,
            etplProviderConfirmed: c.fundingRequest.etplProviderConfirmed,
            submittedAt: c.fundingRequest.submittedAt,
            caseManagerNotifiedAt: c.fundingRequest.caseManagerNotifiedAt,
            fundingReviewStatus: c.fundingRequest.fundingReviewStatus,
            status: c.fundingRequest.status,
            authorization: c.fundingRequest.authorization
              ? {
                  id: c.fundingRequest.authorization.id,
                  itaIssuedAt: c.fundingRequest.authorization.itaIssuedAt,
                  approvedAmount: c.fundingRequest.authorization.approvedAmount,
                  approvalDate: c.fundingRequest.authorization.approvalDate,
                  trainingStartDate: c.fundingRequest.authorization.trainingStartDate,
                  status: c.fundingRequest.authorization.status,
                }
              : null,
          }
        : null
      : undefined,
  };
}

const WIOA_ELIGIBLE_OR_LATER: WioaCaseStatus[] = [
  'WIOA_ELIGIBLE',
  'ETPL_TRAINING_REQUESTED',
  'TRAINING_AUTHORIZATION_PENDING',
  'TUITION_APPROVED',
  'APPRENTICESHIP_ENROLLMENT_COMPLETE',
];
const WIOA_TUITION_APPROVED_OR_LATER: WioaCaseStatus[] = [
  'TUITION_APPROVED',
  'APPRENTICESHIP_ENROLLMENT_COMPLETE',
];

export type WioaDocumentReadiness = {
  total: number;
  accepted: number;
  missing: number;
  underReview: number;
  rejected: number;
};

export type WioaFollowUpItem = {
  caseId: string;
  learnerName: string;
  courseTitle: string;
  status: WioaCaseStatus;
  reason: string;
};

export type WioaBoardPerformance = {
  boardName: string;
  totalCases: number;
  determinedCases: number;
  eligibleCases: number;
  approvalRate: number | null;
  avgDaysToEligibility: number | null;
  fundingConversionRate: number | null;
};

export type WioaReportingSummary = {
  totalCases: number;
  phaseCounts: Record<WioaUiPhase, number>;
  documentReadiness: WioaDocumentReadiness;
  followUpQueue: WioaFollowUpItem[];
  /** Only populated when `includeFunding` is requested (Coordinator) — Partner Staff's report
   * never sees board approval/funding numbers, same visibility split as getWioaCaseDetail. */
  boardPerformance: WioaBoardPerformance[] | null;
};

/** Reporting/analytics aggregates for the Coordinator and Partner Staff dashboards (spec §16 —
 * cohort pipeline, document readiness, follow-up queue, board performance). Computed in JS over
 * the full case list rather than SQL aggregation — prototype scale, same no-pagination assumption
 * as getWioaCases. Follow-up reasons reuse the exact triggers from spec §18 (Automation & Follow-Up
 * Rules) so this reporting view and any future automation agree on what "needs follow-up" means. */
export async function getWioaReportingSummary(opts?: {
  assignedPartnerStaffId?: string;
  includeFunding?: boolean;
}): Promise<WioaReportingSummary> {
  const cases = await prisma.wioaCase.findMany({
    where: opts?.assignedPartnerStaffId
      ? { assignedPartnerStaffId: opts.assignedPartnerStaffId }
      : undefined,
    include: {
      course: { select: { title: true } },
      workforceBoard: { select: { name: true } },
      documents: { select: { status: true } },
      statusHistory: { select: { status: true, changedAt: true }, orderBy: { changedAt: 'asc' } },
      fundingRequest: { select: { id: true } },
    },
  });

  const ALL_PHASES: WioaUiPhase[] = [...WIOA_UI_PHASES, 'Closed'];
  const phaseCounts = Object.fromEntries(ALL_PHASES.map((p) => [p, 0])) as Record<
    WioaUiPhase,
    number
  >;
  const documentReadiness: WioaDocumentReadiness = {
    total: 0,
    accepted: 0,
    missing: 0,
    underReview: 0,
    rejected: 0,
  };
  const followUpQueue: WioaFollowUpItem[] = [];
  const DAY_MS = 1000 * 60 * 60 * 24;
  const now = Date.now();

  const learnerNames = new Map<string, string>();
  async function nameOf(learnerId: string): Promise<string> {
    if (!learnerNames.has(learnerId)) {
      const learner = await getLearnerById(learnerId);
      learnerNames.set(learnerId, learner?.name ?? 'Unknown');
    }
    return learnerNames.get(learnerId)!;
  }

  const byBoard = new Map<
    string,
    {
      totalCases: number;
      determinedCases: number;
      eligibleCases: number;
      daysToEligible: number[];
      tuitionApprovedCases: number;
    }
  >();

  for (const c of cases) {
    phaseCounts[WIOA_STATUS_PHASE[c.status]] += 1;

    for (const doc of c.documents) {
      documentReadiness.total += 1;
      if (doc.status === 'ACCEPTED') documentReadiness.accepted += 1;
      else if (doc.status === 'MISSING') documentReadiness.missing += 1;
      else if (doc.status === 'UPLOADED' || doc.status === 'UNDER_REVIEW')
        documentReadiness.underReview += 1;
      else if (doc.status === 'REJECTED') documentReadiness.rejected += 1;
    }

    if (!c.closedAt) {
      const daysSinceUpdate = (now - c.updatedAt.getTime()) / DAY_MS;
      const hasRejectedDoc = c.documents.some((d) => d.status === 'REJECTED');
      let reason: string | null = null;
      if (hasRejectedDoc) reason = 'Document rejected — needs resubmission';
      else if (c.status === 'AWAITING_RESPONSE' && daysSinceUpdate >= 3)
        reason = 'No response 3+ business days after outreach';
      else if (c.status === 'DOCUMENTS_PENDING' && daysSinceUpdate >= 5)
        reason = 'Documents pending 5+ days';
      else if (c.status === 'WIOA_ELIGIBLE' && !c.fundingRequest)
        reason = 'Eligible — ETPL funding request not started';

      if (reason) {
        followUpQueue.push({
          caseId: c.id,
          learnerName: await nameOf(c.learnerId),
          courseTitle: c.course.title,
          status: c.status,
          reason,
        });
      }
    }

    if (opts?.includeFunding) {
      const boardName = c.workforceBoard?.name ?? 'Unmatched';
      if (!byBoard.has(boardName)) {
        byBoard.set(boardName, {
          totalCases: 0,
          determinedCases: 0,
          eligibleCases: 0,
          daysToEligible: [],
          tuitionApprovedCases: 0,
        });
      }
      const b = byBoard.get(boardName)!;
      b.totalCases += 1;

      const reachedEligibleOrLater = WIOA_ELIGIBLE_OR_LATER.includes(c.status);
      if (reachedEligibleOrLater || c.status === 'CLOSED_INELIGIBLE') b.determinedCases += 1;
      if (reachedEligibleOrLater) {
        b.eligibleCases += 1;
        const eligibleEntry = c.statusHistory.find((h) => h.status === 'WIOA_ELIGIBLE');
        if (eligibleEntry) {
          b.daysToEligible.push((eligibleEntry.changedAt.getTime() - c.createdAt.getTime()) / DAY_MS);
        }
      }
      if (WIOA_TUITION_APPROVED_OR_LATER.includes(c.status)) b.tuitionApprovedCases += 1;
    }
  }

  const boardPerformance = opts?.includeFunding
    ? Array.from(byBoard.entries()).map(([boardName, b]) => ({
        boardName,
        totalCases: b.totalCases,
        determinedCases: b.determinedCases,
        eligibleCases: b.eligibleCases,
        approvalRate: b.determinedCases > 0 ? b.eligibleCases / b.determinedCases : null,
        avgDaysToEligibility:
          b.daysToEligible.length > 0
            ? b.daysToEligible.reduce((a, x) => a + x, 0) / b.daysToEligible.length
            : null,
        fundingConversionRate:
          b.eligibleCases > 0 ? b.tuitionApprovedCases / b.eligibleCases : null,
      }))
    : null;

  return {
    totalCases: cases.length,
    phaseCounts,
    documentReadiness,
    followUpQueue,
    boardPerformance,
  };
}
