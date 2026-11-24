import { getLearnerById } from '@/lib/data/learners';
import type { WioaCaseStatus, WioaDocumentStatus, AppointmentType } from '@/generated/prisma/enums';
import { WIOA_STATUS_PHASE, WIOA_UI_PHASES, type WioaUiPhase } from '@/lib/wioa/status';
import { withRlsContext, type SessionContext } from '@/lib/db/rls';

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

export async function getLearnerProfile(
  viewer: SessionContext,
  learnerId: string,
): Promise<LearnerProfile | null> {
  return withRlsContext(viewer, (tx) => tx.learnerProfile.findUnique({ where: { learnerId } }));
}

export type WioaCommunicationRecord = {
  id: string;
  courseId: string;
  channel: 'EMAIL' | 'CALL' | 'NOTE';
  recipient: string;
  subject: string | null;
  body: string | null;
  sentAt: Date;
};

/** The learner's own "Outreach log" (Funding page) — excludes the NOTE channel, which is an
 * internal Partner Staff/Coordinator follow-up note about the learner, never meant for the
 * learner to see (PTN02-LearnerDetail's "Add a note" is explicitly staff-facing). */
export async function getWioaCommunications(
  viewer: SessionContext,
  learnerId: string,
): Promise<WioaCommunicationRecord[]> {
  return withRlsContext(viewer, (tx) =>
    tx.wioaCommunication.findMany({
      where: { learnerId, channel: { not: 'NOTE' } },
      orderBy: { sentAt: 'desc' },
    }),
  );
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
export async function getWioaCasesForLearner(
  viewer: SessionContext,
  learnerId: string,
): Promise<WioaCaseRecord[]> {
  const cases = await withRlsContext(viewer, (tx) =>
    tx.wioaCase.findMany({
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
    }),
  );

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
  viewer: SessionContext,
  learnerId: string,
  courseId: string,
): Promise<WioaCaseRecord | null> {
  const cases = await getWioaCasesForLearner(viewer, learnerId);
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
  /** Most recent WioaStatusHistory row's timestamp, or createdAt if the case has no history yet
   * (CRD05-StalledCases' "Stalled since" column — getStalledCases below filters on this). */
  lastStatusChangeAt: Date;
  pendingDocumentCount: number;
  /** MISSING or REJECTED documents — the ones that need Partner Staff follow-up, distinct from
   * `pendingDocumentCount` (UPLOADED/UNDER_REVIEW, awaiting staff review). PTN01-Roster's
   * "Missing documents" column/KPI. */
  missingDocumentCount: number;
  /** Most recent communication logged against the case (any channel, including the Partner
   * Staff "Add a note" / NOTE channel) — PTN01-Roster's "Last follow-up" column. */
  lastFollowUp: { channel: 'EMAIL' | 'CALL' | 'NOTE'; body: string | null; sentAt: Date } | null;
  assignedPartnerStaffId: string | null;
  assignedPartnerStaffName: string | null;
  nextAppointment: { type: string; scheduledAt: Date } | null;
};

/** Staff case list — every case by default (Coordinator), or filtered to one Partner Staff
 * account's assigned cases (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — replaces the Phase 2
 * /admin/wioa stepping stone's getAllWioaCases). No pagination — prototype scale, same
 * assumption getLearnerRoster already makes. */
export async function getWioaCases(
  viewer: SessionContext,
  opts?: {
    assignedPartnerStaffId?: string;
  },
): Promise<WioaCaseSummary[]> {
  // The RLS read is just the one findMany — the name lookups below hit the Supabase Auth Admin
  // API per case (src/lib/data/learners.ts), which must not run inside the transaction
  // withRlsContext opens (CLAUDE.md performance conventions — never hold a pooler slot across a
  // network call).
  const cases = await withRlsContext(viewer, (tx) =>
    tx.wioaCase.findMany({
      where: opts?.assignedPartnerStaffId
        ? { assignedPartnerStaffId: opts.assignedPartnerStaffId }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { title: true } },
        workforceBoard: { select: { name: true } },
        documents: { select: { status: true } },
        appointments: {
          where: { scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
        communications: { orderBy: { sentAt: 'desc' }, take: 1 },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
      },
    }),
  );

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
      lastStatusChangeAt: c.statusHistory[0]?.changedAt ?? c.createdAt,
      pendingDocumentCount: c.documents.filter(
        (d) => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW',
      ).length,
      missingDocumentCount: c.documents.filter(
        (d) => d.status === 'MISSING' || d.status === 'REJECTED',
      ).length,
      lastFollowUp: c.communications[0]
        ? {
            channel: c.communications[0].channel,
            body: c.communications[0].body,
            sentAt: c.communications[0].sentAt,
          }
        : null,
      assignedPartnerStaffId: c.assignedPartnerStaffId,
      assignedPartnerStaffName: partnerStaff?.name ?? null,
      nextAppointment: c.appointments[0]
        ? { type: c.appointments[0].type, scheduledAt: c.appointments[0].scheduledAt }
        : null,
    });
  }
  return result;
}

const STALL_LIKELY_CAUSE: Partial<Record<WioaCaseStatus, string>> = {
  AWAITING_RESPONSE: 'No reply from board contact to outreach email',
  DOCUMENTS_PENDING: 'Required documents not yet uploaded by trainee',
  CLOSED_INELIGIBLE: 'Closed / Ineligible — no action expected',
  ELIGIBILITY_UNDER_REVIEW: 'Awaiting board eligibility determination',
  INTAKE_APPOINTMENT_SCHEDULED: 'Awaiting the scheduled intake appointment',
  TRAINING_AUTHORIZATION_PENDING: 'Awaiting board training authorization',
};

export type StalledCase = WioaCaseSummary & { daysStalled: number; likelyCause: string };

/** CRD05-StalledCases — a pre-filtered view of getWioaCases, not a separate dataset, matching
 * the board's own "dtcard-desc" framing. A case counts as stalled at `thresholdDays` with no
 * status change, open or closed (a closed case can still show up — "no action expected" is
 * itself a valid likely-cause row, per the board's own third example row). */
export async function getStalledCases(
  viewer: SessionContext,
  thresholdDays = 14,
): Promise<StalledCase[]> {
  const cases = await getWioaCases(viewer);
  const cutoff = Date.now() - thresholdDays * 86_400_000;
  return cases
    .filter((c) => c.lastStatusChangeAt.getTime() <= cutoff)
    .map((c) => ({
      ...c,
      daysStalled: Math.floor((Date.now() - c.lastStatusChangeAt.getTime()) / 86_400_000),
      likelyCause: STALL_LIKELY_CAUSE[c.status] ?? 'No status change recorded',
    }))
    .sort((a, b) => b.daysStalled - a.daysStalled);
}

export type UpcomingAppointment = {
  id: string;
  caseId: string;
  /** Resolved by the caller from an already-fetched learner roster, not looked up here — see
   * note below. */
  learnerId: string;
  courseTitle: string;
  type: AppointmentType;
  scheduledAt: Date;
};

/** Soonest N upcoming appointments across every WIOA case (not scoped to one case) — Admin
 * Dashboard's "Upcoming WIOA Appointments" panel (ADM02-Dashboard). Reuses getWioaCases'
 * per-case "next appointment" query shape, just without the per-case/per-staff scoping.
 * Returns `learnerId`, not a resolved name — the Dashboard already fetches the full learner
 * roster for its other panels, so resolving names there reuses that data instead of adding a
 * per-row `getLearnerById` call here (CLAUDE.md's "no per-entity queries in a loop"). */
export async function getUpcomingWioaAppointments(
  viewer: SessionContext,
  limit = 4,
): Promise<UpcomingAppointment[]> {
  const appointments = await withRlsContext(viewer, (tx) =>
    tx.appointment.findMany({
      where: { scheduledAt: { gte: new Date() }, completedAt: null },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      include: { wioaCase: { include: { course: { select: { title: true } } } } },
    }),
  );

  return appointments.map((a) => ({
    id: a.id,
    caseId: a.wioaCaseId,
    learnerId: a.wioaCase.learnerId,
    courseTitle: a.wioaCase.course.title,
    type: a.type,
    scheduledAt: a.scheduledAt,
  }));
}

export type LearnerFundingStatus = 'funded' | 'pending' | 'self_pay';

const FUNDED_CASE_STATUSES: WioaCaseStatus[] = [
  'TUITION_APPROVED',
  'APPRENTICESHIP_ENROLLMENT_COMPLETE',
];

/** Per-learner funding status for the Admin Dashboard's and Learners roster's "Status" column
 * (ADM02/ADM03) — batched (one query for every learnerId requested, not a per-row lookup, per
 * CLAUDE.md's "no per-entity queries in a loop"). A learner's most recent open case decides their
 * status; a learner with no open case is 'self_pay' (the real default — not every learner has a
 * WIOA case at all). */
export async function getFundingStatusForLearners(
  viewer: SessionContext,
  learnerIds: string[],
): Promise<Record<string, LearnerFundingStatus>> {
  if (learnerIds.length === 0) return {};
  const cases = await withRlsContext(viewer, (tx) =>
    tx.wioaCase.findMany({
      where: { learnerId: { in: learnerIds }, closedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { learnerId: true, status: true },
    }),
  );
  const latestByLearner = new Map<string, WioaCaseStatus>();
  for (const c of cases) {
    if (!latestByLearner.has(c.learnerId)) latestByLearner.set(c.learnerId, c.status);
  }
  const result: Record<string, LearnerFundingStatus> = {};
  for (const id of learnerIds) {
    const status = latestByLearner.get(id);
    result[id] = !status
      ? 'self_pay'
      : FUNDED_CASE_STATUSES.includes(status)
        ? 'funded'
        : 'pending';
  }
  return result;
}

/** Count of currently-open WIOA cases whose funding is actually approved — the Admin Dashboard's
 * "Funded Cases (WIOA)" KPI (ADM02). Counts cases, matching the board's own framing, not learners. */
export async function getFundedCaseCount(viewer: SessionContext): Promise<number> {
  return withRlsContext(viewer, (tx) =>
    tx.wioaCase.count({ where: { closedAt: null, status: { in: FUNDED_CASE_STATUSES } } }),
  );
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
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  assignedPartnerStaffId: string | null;
  assignedPartnerStaffName: string | null;
  statusHistory: {
    id: string;
    status: WioaCaseStatus;
    changedAt: Date;
    changedBy: string;
    changedByName: string;
  }[];
  communications: WioaCommunicationRecord[];
  /** Only populated when `includeFunding` is passed (Coordinator dashboard) — Partner Staff's
   * fetch never requests it, so funding data never reaches the client bundle for that role
   * (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3 — "excludes funding data entirely", not just display). */
  funding?: WioaFundingRecord | null;
};

export async function getWioaCaseDetail(
  viewer: SessionContext,
  caseId: string,
  opts?: { includeFunding?: boolean },
): Promise<WioaCaseDetail | null> {
  // `findUnique` returns null for a case this viewer can't see under app_can_access_case, same
  // as a case that doesn't exist at all — callers already treat both as not-found (see
  // src/app/partner/[caseId]/page.tsx's notFound() check), so this isn't a behavior change.
  const c = await withRlsContext(viewer, (tx) =>
    tx.wioaCase.findUnique({
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
    }),
  );
  if (!c) return null;

  const learner = await getLearnerById(c.learnerId);
  const partnerStaff = c.assignedPartnerStaffId
    ? await getLearnerById(c.assignedPartnerStaffId)
    : undefined;

  const changedByIds = [...new Set(c.statusHistory.map((h) => h.changedBy))];
  const changedByNames = new Map(
    (await Promise.all(changedByIds.map((id) => getLearnerById(id)))).map((user, i) => [
      changedByIds[i],
      user?.name ?? 'Unknown',
    ]),
  );

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
    learnerId: c.learnerId,
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
    statusHistory: c.statusHistory.map((h) => ({
      ...h,
      changedByName: changedByNames.get(h.changedBy) ?? 'Unknown',
    })),
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
  /** Sum of FundingAuthorization.approvedAmount for this board's funded cases. Real figure —
   * there is no "requested amount" anywhere in the schema, so this only ever shows what was
   * actually approved, never a requested-vs-approved comparison. */
  totalApprovedAmount: number;
  fundedCases: number;
  avgDaysToApproval: number | null;
};

/** Aggregates WioaBoardPerformance across every board — the overall KPI row for the Funding
 * Impact report section. Only computed when includeFunding is requested. */
export type WioaFundingImpact = {
  totalApprovedAmount: number;
  fundedCases: number;
  fundingRequestsSubmitted: number;
  approvalRate: number | null;
  avgDaysToApproval: number | null;
};

export type WioaReportingSummary = {
  totalCases: number;
  phaseCounts: Record<WioaUiPhase, number>;
  documentReadiness: WioaDocumentReadiness;
  followUpQueue: WioaFollowUpItem[];
  /** Only populated when `includeFunding` is requested (Coordinator) — Partner Staff's report
   * never sees board approval/funding numbers, same visibility split as getWioaCaseDetail. */
  boardPerformance: WioaBoardPerformance[] | null;
  fundingImpact: WioaFundingImpact | null;
};

/** Reporting/analytics aggregates for the Coordinator and Partner Staff dashboards (spec §16 —
 * cohort pipeline, document readiness, follow-up queue, board performance). Computed in JS over
 * the full case list rather than SQL aggregation — prototype scale, same no-pagination assumption
 * as getWioaCases. Follow-up reasons reuse the exact triggers from spec §18 (Automation & Follow-Up
 * Rules) so this reporting view and any future automation agree on what "needs follow-up" means. */
export async function getWioaReportingSummary(
  viewer: SessionContext,
  opts?: {
    assignedPartnerStaffId?: string;
    includeFunding?: boolean;
  },
): Promise<WioaReportingSummary> {
  // Same ordering rule as getWioaCases — only the findMany runs inside the RLS transaction; the
  // nameOf() loop below hits the Supabase Auth Admin API per case and must run after it closes.
  const cases = await withRlsContext(viewer, (tx) =>
    tx.wioaCase.findMany({
      where: opts?.assignedPartnerStaffId
        ? { assignedPartnerStaffId: opts.assignedPartnerStaffId }
        : undefined,
      include: {
        course: { select: { title: true } },
        workforceBoard: { select: { name: true } },
        documents: { select: { status: true } },
        statusHistory: {
          select: { status: true, changedAt: true },
          orderBy: { changedAt: 'asc' },
        },
        fundingRequest: {
          select: {
            id: true,
            submittedAt: true,
            authorization: { select: { approvedAmount: true, approvalDate: true } },
          },
        },
      },
    }),
  );

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
      totalApprovedAmount: number;
      fundedCases: number;
      daysToApproval: number[];
      fundingRequestsSubmitted: number;
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
          totalApprovedAmount: 0,
          fundedCases: 0,
          daysToApproval: [],
          fundingRequestsSubmitted: 0,
        });
      }
      const b = byBoard.get(boardName)!;
      b.totalCases += 1;

      if (c.fundingRequest?.submittedAt) b.fundingRequestsSubmitted += 1;

      const approvedAmount = c.fundingRequest?.authorization?.approvedAmount;
      if (approvedAmount != null) {
        b.totalApprovedAmount += approvedAmount;
        b.fundedCases += 1;
        const submittedAt = c.fundingRequest?.submittedAt;
        const approvalDate = c.fundingRequest?.authorization?.approvalDate;
        if (submittedAt && approvalDate) {
          b.daysToApproval.push((approvalDate.getTime() - submittedAt.getTime()) / DAY_MS);
        }
      }

      const reachedEligibleOrLater = WIOA_ELIGIBLE_OR_LATER.includes(c.status);
      if (reachedEligibleOrLater || c.status === 'CLOSED_INELIGIBLE') b.determinedCases += 1;
      if (reachedEligibleOrLater) {
        b.eligibleCases += 1;
        const eligibleEntry = c.statusHistory.find((h) => h.status === 'WIOA_ELIGIBLE');
        if (eligibleEntry) {
          b.daysToEligible.push(
            (eligibleEntry.changedAt.getTime() - c.createdAt.getTime()) / DAY_MS,
          );
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
        totalApprovedAmount: b.totalApprovedAmount,
        fundedCases: b.fundedCases,
        avgDaysToApproval:
          b.daysToApproval.length > 0
            ? b.daysToApproval.reduce((a, x) => a + x, 0) / b.daysToApproval.length
            : null,
      }))
    : null;

  const fundingImpact: WioaFundingImpact | null = opts?.includeFunding
    ? (() => {
        const allDaysToApproval = Array.from(byBoard.values()).flatMap((b) => b.daysToApproval);
        const fundedCases = Array.from(byBoard.values()).reduce((sum, b) => sum + b.fundedCases, 0);
        const fundingRequestsSubmitted = Array.from(byBoard.values()).reduce(
          (sum, b) => sum + b.fundingRequestsSubmitted,
          0,
        );
        return {
          totalApprovedAmount: Array.from(byBoard.values()).reduce(
            (sum, b) => sum + b.totalApprovedAmount,
            0,
          ),
          fundedCases,
          fundingRequestsSubmitted,
          approvalRate:
            fundingRequestsSubmitted > 0 ? fundedCases / fundingRequestsSubmitted : null,
          avgDaysToApproval:
            allDaysToApproval.length > 0
              ? allDaysToApproval.reduce((a, x) => a + x, 0) / allDaysToApproval.length
              : null,
        };
      })()
    : null;

  return {
    totalCases: cases.length,
    phaseCounts,
    documentReadiness,
    followUpQueue,
    boardPerformance,
    fundingImpact,
  };
}
