import { cacheLife, cacheTag } from 'next/cache';
import { getLearnerById } from '@/lib/data/learners';
import type {
  WioaEligibilityStatus,
  WioaFundingStatus,
  WioaDocumentStatus,
  AppointmentType,
} from '@/generated/prisma/enums';
import { WIOA_ELIGIBILITY_STATUS_PHASE, WIOA_UI_PHASES, type WioaUiPhase } from '@/lib/wioa/status';
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
  /** Null for the general eligibility outreach — a communication only has a course when it's
   * specifically about one course's funding request
   * (docs/plans/wioa-spec-alignment-kickoff.md #1, full split). */
  courseId: string | null;
  channel: 'EMAIL' | 'CALL' | 'NOTE';
  recipient: string;
  subject: string | null;
  body: string | null;
  status: 'SENT' | 'FAILED';
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

export type WioaEligibilityCaseRecord = {
  id: string;
  status: WioaEligibilityStatus;
  createdAt: Date;
  closedAt: Date | null;
  boardName: string | null;
  ajccName: string | null;
  contactName: string | null;
  documents: WioaDocumentRecord[];
  appointments: WioaAppointmentRecord[];
  /** Oldest to most recent — feeds the learner-facing phase timeline (LRN10-FundingStatus). */
  statusHistory: { status: WioaEligibilityStatus; changedAt: Date }[];
};

/** The learner's one master WIOA case — eligibility pipeline, document checklist, orientation/
 * intake appointments (docs/plans/wioa-spec-alignment-kickoff.md #1, full split). Null if they've
 * never started outreach. */
export async function getWioaEligibilityCaseForLearner(
  viewer: SessionContext,
  learnerId: string,
): Promise<WioaEligibilityCaseRecord | null> {
  const c = await withRlsContext(viewer, (tx) =>
    tx.wioaCase.findUnique({
      where: { learnerId },
      include: {
        workforceBoard: { select: { name: true } },
        ajccCenter: { select: { name: true } },
        contact: { select: { name: true } },
        documents: { include: { requirement: true } },
        appointments: { orderBy: { scheduledAt: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    }),
  );
  if (!c) return null;

  return {
    id: c.id,
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
    statusHistory: c.statusHistory.map((h) => ({ status: h.status, changedAt: h.changedAt })),
  };
}

/// Back-compat aliases for UI call sites not yet reworked for the full master/course split
/// (docs/plans/wioa-spec-alignment-kickoff.md #1) — a real UX pass still needs to show funding
/// requests as their own list rather than folding into one "case." These keep the app compiling
/// and showing the eligibility case (the learner's one master case) in the meantime.
export type WioaCaseRecord = WioaEligibilityCaseRecord;

export async function getWioaCasesForLearner(
  viewer: SessionContext,
  learnerId: string,
): Promise<WioaCaseRecord[]> {
  const c = await getWioaEligibilityCaseForLearner(viewer, learnerId);
  return c ? [c] : [];
}

export async function getWioaCaseForLearnerAndCourse(
  viewer: SessionContext,
  learnerId: string,
  _courseId: string,
): Promise<WioaCaseRecord | null> {
  return getWioaEligibilityCaseForLearner(viewer, learnerId);
}

export type WioaCourseFundingRecord = {
  id: string;
  courseId: string;
  courseTitle: string;
  status: WioaFundingStatus;
  createdAt: Date;
  closedAt: Date | null;
  fundingStatusHistory: { status: WioaFundingStatus; changedAt: Date }[];
};

/** Every course the learner has requested WIOA funding for, independent of each other — the
 * learner Funding page's course-level funding list (docs/plans/wioa-spec-alignment-kickoff.md #1,
 * full split). Only ever non-empty once the learner's master case is WIOA_ELIGIBLE. */
export async function getWioaCourseFundingForLearner(
  viewer: SessionContext,
  learnerId: string,
): Promise<WioaCourseFundingRecord[]> {
  const cases = await withRlsContext(viewer, (tx) =>
    tx.wioaCourseCase.findMany({
      where: { learnerId },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { slug: true, title: true } },
        fundingStatusHistory: { orderBy: { changedAt: 'asc' } },
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
    fundingStatusHistory: c.fundingStatusHistory.map((h) => ({
      status: h.status,
      changedAt: h.changedAt,
    })),
  }));
}

export type WioaCaseSummary = {
  /** Master case id. */
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  status: WioaEligibilityStatus;
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
  /** Each course this learner has requested funding for and its current status — the funding side
   * doesn't duplicate into its own staff-list row, it's a nested summary on the one case that
   * actually represents this learner now (docs/plans/wioa-spec-alignment-kickoff.md #1). */
  fundingRequests: { courseCaseId: string; courseTitle: string; status: WioaFundingStatus }[];
  /// Back-compat for UI call sites not yet reworked to show the funding-requests list
  /// (docs/plans/wioa-spec-alignment-kickoff.md #1) — the first course this learner requested
  /// funding for, or null if none yet. A learner with more than one funding request loses
  /// information here; `fundingRequests` is the real, complete list.
  courseTitle: string | null;
};

/** Staff case list — one row per learner (master case), every case by default (Coordinator), or
 * filtered to one Partner Staff account's assigned cases. No pagination — prototype scale. */
export async function getWioaCases(
  viewer: SessionContext,
  opts?: {
    assignedPartnerStaffId?: string;
  },
): Promise<WioaCaseSummary[]> {
  // The RLS read is just the one findMany — the name lookups below hit the Supabase Auth Admin
  // API per case, which must not run inside the transaction withRlsContext opens (CLAUDE.md
  // performance conventions — never hold a pooler slot across a network call).
  const cases = await withRlsContext(viewer, (tx) =>
    tx.wioaCase.findMany({
      where: opts?.assignedPartnerStaffId
        ? { assignedPartnerStaffId: opts.assignedPartnerStaffId }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        workforceBoard: { select: { name: true } },
        documents: { select: { status: true } },
        appointments: {
          where: { scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
        communications: { orderBy: { sentAt: 'desc' }, take: 1 },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
        courseCases: { include: { course: { select: { title: true } } } },
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
      fundingRequests: c.courseCases.map((cc) => ({
        courseCaseId: cc.id,
        courseTitle: cc.course.title,
        status: cc.status,
      })),
      courseTitle: c.courseCases[0]?.course.title ?? null,
    });
  }
  return result;
}

const ELIGIBILITY_STALL_LIKELY_CAUSE: Partial<Record<WioaEligibilityStatus, string>> = {
  AWAITING_RESPONSE: 'No reply from board contact to outreach email',
  DOCUMENTS_PENDING: 'Required documents not yet uploaded by trainee',
  CLOSED_INELIGIBLE: 'Closed / Ineligible — no action expected',
  ELIGIBILITY_UNDER_REVIEW: 'Awaiting board eligibility determination',
  INTAKE_APPOINTMENT_SCHEDULED: 'Awaiting the scheduled intake appointment',
};

export type StalledCase = WioaCaseSummary & { daysStalled: number; likelyCause: string };

/** CRD05-StalledCases — a pre-filtered view of getWioaCases, not a separate dataset. A case
 * counts as stalled at `thresholdDays` with no eligibility status change, open or closed.
 * Covers eligibility-stage stalls only (the master case) — a funding request that's stalled
 * without the eligibility case itself being stale isn't surfaced here yet; that's a known gap
 * left for a follow-up pass (docs/plans/wioa-spec-alignment-kickoff.md #1). */
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
      likelyCause: ELIGIBILITY_STALL_LIKELY_CAUSE[c.status] ?? 'No status change recorded',
    }))
    .sort((a, b) => b.daysStalled - a.daysStalled);
}

export type UpcomingAppointment = {
  id: string;
  /** Master case id. */
  caseId: string;
  /** Resolved by the caller from an already-fetched learner roster, not looked up here — see
   * note below. */
  learnerId: string;
  type: AppointmentType;
  scheduledAt: Date;
};

/** Soonest N upcoming appointments across every WIOA case (not scoped to one case) — Admin
 * Dashboard's "Upcoming WIOA Appointments" panel (ADM02-Dashboard). Shows the learner, not a
 * course — appointments are a master-case (eligibility-stage) concept now
 * (docs/plans/wioa-spec-alignment-kickoff.md #1, full split), not tied to any one course even
 * when `courseCaseId` happens to be set. Returns `learnerId`, not a resolved name — the Dashboard
 * already fetches the full learner roster for its other panels (CLAUDE.md's "no per-entity
 * queries in a loop"). Short cache — an appointment scheduled/cancelled in the last ~30s can lag
 * here without blocking any action. */
export async function getUpcomingWioaAppointments(
  viewer: SessionContext,
  limit = 4,
): Promise<UpcomingAppointment[]> {
  'use cache';
  cacheLife({ stale: 30, revalidate: 30, expire: 120 });
  cacheTag('wioa-upcoming-appointments');
  const appointments = await withRlsContext(viewer, (tx) =>
    tx.appointment.findMany({
      where: { scheduledAt: { gte: new Date() }, completedAt: null },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      include: { masterCase: { select: { learnerId: true } } },
    }),
  );

  return appointments.map((a) => ({
    id: a.id,
    caseId: a.masterCaseId,
    learnerId: a.masterCase.learnerId,
    type: a.type,
    scheduledAt: a.scheduledAt,
  }));
}

export type LearnerFundingStatus = 'funded' | 'pending' | 'wioa_interest' | 'self_pay';

const FUNDED_COURSE_STATUSES: WioaFundingStatus[] = [
  'TUITION_APPROVED',
  'APPRENTICESHIP_ENROLLMENT_COMPLETE',
];

/** Per-learner funding status for the Admin Dashboard's and Learners roster's "Status" column —
 * batched (one query per table, not a per-row lookup, per CLAUDE.md's "no per-entity queries in a
 * loop"). 'funded' if any open course-case has reached TUITION_APPROVED+; 'pending' if they have
 * a master case open but no course funded yet; 'wioa_interest' if they checked "pursuing WIOA" at
 * signup (LearnerProfile.fundingSource = WIOA_PENDING) but staff hasn't started outreach yet (no
 * WioaCase row) — this is the admin's actionable outreach queue, previously indistinguishable from
 * true self-pay; 'self_pay' only when neither signal is present. Dashboard-only badge — not the
 * case-management data itself, so a short cache is low-risk. */
export async function getFundingStatusForLearners(
  viewer: SessionContext,
  learnerIds: string[],
): Promise<Record<string, LearnerFundingStatus>> {
  'use cache';
  cacheLife({ stale: 30, revalidate: 30, expire: 120 });
  cacheTag('wioa-funding-status');
  if (learnerIds.length === 0) return {};
  const [courseCases, masterCases, profiles] = await withRlsContext(viewer, (tx) =>
    Promise.all([
      tx.wioaCourseCase.findMany({
        where: { learnerId: { in: learnerIds }, closedAt: null },
        select: { learnerId: true, status: true },
      }),
      tx.wioaCase.findMany({
        where: { learnerId: { in: learnerIds } },
        select: { learnerId: true },
      }),
      tx.learnerProfile.findMany({
        where: { learnerId: { in: learnerIds }, fundingSource: 'WIOA_PENDING' },
        select: { learnerId: true },
      }),
    ]),
  );
  const fundedLearners = new Set(
    courseCases.filter((c) => FUNDED_COURSE_STATUSES.includes(c.status)).map((c) => c.learnerId),
  );
  const hasMasterCase = new Set(masterCases.map((c) => c.learnerId));
  const wantsWioa = new Set(profiles.map((p) => p.learnerId));

  const result: Record<string, LearnerFundingStatus> = {};
  for (const id of learnerIds) {
    result[id] = fundedLearners.has(id)
      ? 'funded'
      : hasMasterCase.has(id)
        ? 'pending'
        : wantsWioa.has(id)
          ? 'wioa_interest'
          : 'self_pay';
  }
  return result;
}

/** Count of currently-open course-cases whose funding is actually approved — the Admin
 * Dashboard's "Funded Cases (WIOA)" KPI (ADM02). Counts funding requests, matching the board's
 * own framing, not learners. */
export async function getFundedCaseCount(viewer: SessionContext): Promise<number> {
  'use cache';
  cacheLife({ stale: 30, revalidate: 30, expire: 120 });
  cacheTag('wioa-funded-case-count');
  return withRlsContext(viewer, (tx) =>
    tx.wioaCourseCase.count({ where: { closedAt: null, status: { in: FUNDED_COURSE_STATUSES } } }),
  );
}

export type WioaFundingRecord = {
  id: string;
  trainingProgram: string | null;
  etplProviderConfirmed: boolean;
  submittedAt: Date | null;
  caseManagerNotifiedAt: Date | null;
  requestedAmount: number | null;
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

export type WioaCaseDetail = WioaEligibilityCaseRecord & {
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  assignedPartnerStaffId: string | null;
  assignedPartnerStaffName: string | null;
  statusHistory: {
    id: string;
    status: WioaEligibilityStatus;
    changedAt: Date;
    changedBy: string;
    changedByName: string;
  }[];
  communications: WioaCommunicationRecord[];
  /** Every course this learner has an open or closed funding request for — only populated when
   * `includeFunding` is passed (Coordinator dashboard); Partner Staff's fetch never requests it,
   * so funding data never reaches the client bundle for that role. */
  fundingRequests?: (WioaCourseFundingRecord & { funding: WioaFundingRecord | null })[];
  /// Back-compat for UI call sites not yet reworked for the full master/course split
  /// (docs/plans/wioa-spec-alignment-kickoff.md #1) — the first funding request's course/funding
  /// data, or null. `fundingRequests` above is the real, complete list.
  courseTitle: string | null;
  funding: WioaFundingRecord | null;
};

/** Staff detail view for one learner's master WIOA case, with their funding requests nested
 * (docs/plans/wioa-spec-alignment-kickoff.md #1, full split). `caseId` is the master case id. */
export async function getWioaCaseDetail(
  viewer: SessionContext,
  caseId: string,
  opts?: { includeFunding?: boolean },
): Promise<WioaCaseDetail | null> {
  const c = await withRlsContext(viewer, (tx) =>
    tx.wioaCase.findUnique({
      where: { id: caseId },
      include: {
        workforceBoard: { select: { name: true } },
        ajccCenter: { select: { name: true } },
        contact: { select: { name: true } },
        documents: { include: { requirement: true } },
        appointments: { orderBy: { scheduledAt: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        communications: { orderBy: { sentAt: 'desc' } },
        // Always fetched (prototype scale — a handful of course-cases per learner at most);
        // `opts?.includeFunding` only controls whether it's returned below, same visibility
        // boundary as before (Partner Staff's fetch never requests it, so funding data never
        // reaches that role's client bundle).
        courseCases: {
          include: {
            course: { select: { slug: true, title: true } },
            fundingStatusHistory: { orderBy: { changedAt: 'asc' } },
            fundingRequest: { include: { authorization: true } },
          },
        },
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
      status: comm.status,
      sentAt: comm.sentAt,
    })),
    courseTitle:
      opts?.includeFunding && c.courseCases ? (c.courseCases[0]?.course.title ?? null) : null,
    funding:
      opts?.includeFunding && c.courseCases && c.courseCases[0]?.fundingRequest
        ? {
            id: c.courseCases[0].fundingRequest.id,
            trainingProgram: c.courseCases[0].fundingRequest.trainingProgram,
            etplProviderConfirmed: c.courseCases[0].fundingRequest.etplProviderConfirmed,
            submittedAt: c.courseCases[0].fundingRequest.submittedAt,
            caseManagerNotifiedAt: c.courseCases[0].fundingRequest.caseManagerNotifiedAt,
            requestedAmount: c.courseCases[0].fundingRequest.requestedAmount,
            fundingReviewStatus: c.courseCases[0].fundingRequest.fundingReviewStatus,
            status: c.courseCases[0].fundingRequest.status,
            authorization: c.courseCases[0].fundingRequest.authorization
              ? {
                  id: c.courseCases[0].fundingRequest.authorization.id,
                  itaIssuedAt: c.courseCases[0].fundingRequest.authorization.itaIssuedAt,
                  approvedAmount: c.courseCases[0].fundingRequest.authorization.approvedAmount,
                  approvalDate: c.courseCases[0].fundingRequest.authorization.approvalDate,
                  trainingStartDate:
                    c.courseCases[0].fundingRequest.authorization.trainingStartDate,
                  status: c.courseCases[0].fundingRequest.authorization.status,
                }
              : null,
          }
        : null,
    fundingRequests:
      opts?.includeFunding && c.courseCases
        ? c.courseCases.map((cc) => ({
            id: cc.id,
            courseId: cc.course.slug,
            courseTitle: cc.course.title,
            status: cc.status,
            createdAt: cc.createdAt,
            closedAt: cc.closedAt,
            fundingStatusHistory: cc.fundingStatusHistory.map((h) => ({
              status: h.status,
              changedAt: h.changedAt,
            })),
            funding: cc.fundingRequest
              ? {
                  id: cc.fundingRequest.id,
                  trainingProgram: cc.fundingRequest.trainingProgram,
                  etplProviderConfirmed: cc.fundingRequest.etplProviderConfirmed,
                  submittedAt: cc.fundingRequest.submittedAt,
                  caseManagerNotifiedAt: cc.fundingRequest.caseManagerNotifiedAt,
                  requestedAmount: cc.fundingRequest.requestedAmount,
                  fundingReviewStatus: cc.fundingRequest.fundingReviewStatus,
                  status: cc.fundingRequest.status,
                  authorization: cc.fundingRequest.authorization
                    ? {
                        id: cc.fundingRequest.authorization.id,
                        itaIssuedAt: cc.fundingRequest.authorization.itaIssuedAt,
                        approvedAmount: cc.fundingRequest.authorization.approvedAmount,
                        approvalDate: cc.fundingRequest.authorization.approvalDate,
                        trainingStartDate: cc.fundingRequest.authorization.trainingStartDate,
                        status: cc.fundingRequest.authorization.status,
                      }
                    : null,
                }
              : null,
          }))
        : undefined,
  };
}

const WIOA_TUITION_APPROVED_OR_LATER: WioaFundingStatus[] = [
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
  status: WioaEligibilityStatus;
  reason: string;
  /// Back-compat: always null — eligibility-stage follow-up items aren't about one course
  /// (docs/plans/wioa-spec-alignment-kickoff.md #1). Kept only so existing UI call sites compile.
  courseTitle: null;
};

export type WioaBoardPerformance = {
  boardName: string;
  totalCases: number;
  determinedCases: number;
  eligibleCases: number;
  approvalRate: number | null;
  avgDaysToEligibility: number | null;
  fundingConversionRate: number | null;
  /** Sum of FundingAuthorization.approvedAmount for this board's funded course-cases. */
  totalApprovedAmount: number;
  /** Sum of EtplFundingRequest.requestedAmount for this board's course-cases — what NFCAP asked
   * for, independent of what was granted. */
  totalRequestedAmount: number;
  fundedCases: number;
  avgDaysToApproval: number | null;
};

/** Aggregates WioaBoardPerformance across every board — the overall KPI row for the Funding
 * Impact report section. Only computed when includeFunding is requested. */
export type WioaFundingImpact = {
  totalApprovedAmount: number;
  totalRequestedAmount: number;
  approvalRateByAmount: number | null;
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
  boardPerformance: WioaBoardPerformance[] | null;
  fundingImpact: WioaFundingImpact | null;
};

/** Reporting/analytics aggregates for the Coordinator and Partner Staff dashboards (spec §16).
 * Eligibility metrics (phaseCounts, avgDaysToEligibility, approvalRate) are computed once per
 * learner (master case) — not once per course — so a learner with multiple funding requests no
 * longer inflates them (the bug the per-course case model had before
 * docs/plans/wioa-spec-alignment-kickoff.md #1's full split). Funding metrics
 * (fundingConversionRate, totalApprovedAmount, avgDaysToApproval) are computed per course-case,
 * matched to a board through its master case. */
export async function getWioaReportingSummary(
  viewer: SessionContext,
  opts?: {
    assignedPartnerStaffId?: string;
    includeFunding?: boolean;
  },
): Promise<WioaReportingSummary> {
  const masterWhere = opts?.assignedPartnerStaffId
    ? { assignedPartnerStaffId: opts.assignedPartnerStaffId }
    : undefined;

  const [masterCases, courseCases] = await withRlsContext(viewer, (tx) =>
    Promise.all([
      tx.wioaCase.findMany({
        where: masterWhere,
        include: {
          workforceBoard: { select: { name: true } },
          documents: { select: { status: true } },
          statusHistory: {
            select: { status: true, changedAt: true },
            orderBy: { changedAt: 'asc' },
          },
          courseCases: { select: { id: true } },
        },
      }),
      opts?.includeFunding
        ? tx.wioaCourseCase.findMany({
            where: masterWhere ? { masterCase: masterWhere } : undefined,
            include: {
              masterCase: { select: { workforceBoard: { select: { name: true } } } },
              fundingRequest: {
                select: {
                  submittedAt: true,
                  requestedAmount: true,
                  authorization: { select: { approvedAmount: true, approvalDate: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]),
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
    }
  >();

  for (const c of masterCases) {
    phaseCounts[WIOA_ELIGIBILITY_STATUS_PHASE[c.status]] += 1;

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
      else if (c.status === 'WIOA_ELIGIBLE' && c.courseCases.length === 0)
        reason = 'Eligible — no ETPL funding request started yet';

      if (reason) {
        followUpQueue.push({
          caseId: c.id,
          learnerName: await nameOf(c.learnerId),
          status: c.status,
          reason,
          courseTitle: null,
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
        });
      }
      const b = byBoard.get(boardName)!;
      b.totalCases += 1;
      const determined = c.status === 'WIOA_ELIGIBLE' || c.status === 'CLOSED_INELIGIBLE';
      if (determined) b.determinedCases += 1;
      if (c.status === 'WIOA_ELIGIBLE') {
        b.eligibleCases += 1;
        const eligibleEntry = c.statusHistory.find((h) => h.status === 'WIOA_ELIGIBLE');
        if (eligibleEntry) {
          b.daysToEligible.push(
            (eligibleEntry.changedAt.getTime() - c.createdAt.getTime()) / DAY_MS,
          );
        }
      }
    }
  }

  const byBoardFunding = new Map<
    string,
    {
      tuitionApprovedCases: number;
      totalApprovedAmount: number;
      totalRequestedAmount: number;
      fundedCases: number;
      daysToApproval: number[];
      fundingRequestsSubmitted: number;
    }
  >();
  for (const cc of courseCases) {
    const boardName = cc.masterCase.workforceBoard?.name ?? 'Unmatched';
    if (!byBoardFunding.has(boardName)) {
      byBoardFunding.set(boardName, {
        tuitionApprovedCases: 0,
        totalApprovedAmount: 0,
        totalRequestedAmount: 0,
        fundedCases: 0,
        daysToApproval: [],
        fundingRequestsSubmitted: 0,
      });
    }
    const b = byBoardFunding.get(boardName)!;
    if (cc.fundingRequest?.submittedAt) b.fundingRequestsSubmitted += 1;
    if (cc.fundingRequest?.requestedAmount != null)
      b.totalRequestedAmount += cc.fundingRequest.requestedAmount;

    const approvedAmount = cc.fundingRequest?.authorization?.approvedAmount;
    if (approvedAmount != null) {
      b.totalApprovedAmount += approvedAmount;
      b.fundedCases += 1;
      const submittedAt = cc.fundingRequest?.submittedAt;
      const approvalDate = cc.fundingRequest?.authorization?.approvalDate;
      if (submittedAt && approvalDate) {
        b.daysToApproval.push((approvalDate.getTime() - submittedAt.getTime()) / DAY_MS);
      }
    }
    if (WIOA_TUITION_APPROVED_OR_LATER.includes(cc.status)) b.tuitionApprovedCases += 1;
  }

  const boardPerformance = opts?.includeFunding
    ? Array.from(byBoard.entries()).map(([boardName, b]) => {
        const f = byBoardFunding.get(boardName) ?? {
          tuitionApprovedCases: 0,
          totalApprovedAmount: 0,
          totalRequestedAmount: 0,
          fundedCases: 0,
          daysToApproval: [],
          fundingRequestsSubmitted: 0,
        };
        return {
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
            b.eligibleCases > 0 ? f.tuitionApprovedCases / b.eligibleCases : null,
          totalApprovedAmount: f.totalApprovedAmount,
          totalRequestedAmount: f.totalRequestedAmount,
          fundedCases: f.fundedCases,
          avgDaysToApproval:
            f.daysToApproval.length > 0
              ? f.daysToApproval.reduce((a, x) => a + x, 0) / f.daysToApproval.length
              : null,
        };
      })
    : null;

  const fundingImpact: WioaFundingImpact | null = opts?.includeFunding
    ? (() => {
        const all = Array.from(byBoardFunding.values());
        const allDaysToApproval = all.flatMap((b) => b.daysToApproval);
        const fundedCases = all.reduce((sum, b) => sum + b.fundedCases, 0);
        const fundingRequestsSubmitted = all.reduce(
          (sum, b) => sum + b.fundingRequestsSubmitted,
          0,
        );
        const totalApprovedAmount = all.reduce((sum, b) => sum + b.totalApprovedAmount, 0);
        const totalRequestedAmount = all.reduce((sum, b) => sum + b.totalRequestedAmount, 0);
        return {
          totalApprovedAmount,
          totalRequestedAmount,
          approvalRateByAmount:
            totalRequestedAmount > 0 ? totalApprovedAmount / totalRequestedAmount : null,
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
    totalCases: masterCases.length,
    phaseCounts,
    documentReadiness,
    followUpQueue,
    boardPerformance,
    fundingImpact,
  };
}
