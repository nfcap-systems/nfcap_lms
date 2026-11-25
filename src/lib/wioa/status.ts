import type { WioaEligibilityStatus, WioaFundingStatus } from '@/generated/prisma/enums';

/** The eligibility pipeline's UI phases (spec Section 7, steps 1-13) — one-time per student, on
 * the master case. Funding/enrollment are their own, separate phase set below (per course). */
export const WIOA_UI_PHASES = ['Registration', 'Matching', 'Contact', 'Eligibility Process'] as const;

export type WioaUiPhase = (typeof WIOA_UI_PHASES)[number] | 'Closed';

export const WIOA_ELIGIBILITY_STATUS_ORDER: WioaEligibilityStatus[] = [
  'REGISTERED',
  'WORKFORCE_BOARD_MATCHED',
  'INITIAL_CONTACT_SENT',
  'AWAITING_RESPONSE',
  'ORIENTATION_SCHEDULED',
  'ORIENTATION_COMPLETED',
  'CALJOBS_COMPLETED',
  'WIOA_APPLICATION_SUBMITTED',
  'DOCUMENTS_PENDING',
  'DOCUMENTS_SUBMITTED',
  'INTAKE_APPOINTMENT_SCHEDULED',
  'ELIGIBILITY_UNDER_REVIEW',
  'WIOA_ELIGIBLE',
  'CLOSED_INELIGIBLE',
];

export const WIOA_ELIGIBILITY_STATUS_LABEL: Record<WioaEligibilityStatus, string> = {
  REGISTERED: 'Registered',
  WORKFORCE_BOARD_MATCHED: 'Workforce Board Matched',
  INITIAL_CONTACT_SENT: 'Initial Contact Sent',
  AWAITING_RESPONSE: 'Awaiting Response',
  ORIENTATION_SCHEDULED: 'Orientation Scheduled',
  ORIENTATION_COMPLETED: 'Orientation Completed',
  CALJOBS_COMPLETED: 'CalJOBS Completed',
  WIOA_APPLICATION_SUBMITTED: 'WIOA Application Submitted',
  DOCUMENTS_PENDING: 'Documents Pending',
  DOCUMENTS_SUBMITTED: 'Documents Submitted',
  INTAKE_APPOINTMENT_SCHEDULED: 'Intake Appointment Scheduled',
  ELIGIBILITY_UNDER_REVIEW: 'Eligibility Under Review',
  WIOA_ELIGIBLE: 'WIOA Eligible',
  CLOSED_INELIGIBLE: 'Closed / Ineligible',
};

export const WIOA_ELIGIBILITY_STATUS_PHASE: Record<WioaEligibilityStatus, WioaUiPhase> = {
  REGISTERED: 'Registration',
  WORKFORCE_BOARD_MATCHED: 'Matching',
  INITIAL_CONTACT_SENT: 'Contact',
  AWAITING_RESPONSE: 'Contact',
  ORIENTATION_SCHEDULED: 'Eligibility Process',
  ORIENTATION_COMPLETED: 'Eligibility Process',
  CALJOBS_COMPLETED: 'Eligibility Process',
  WIOA_APPLICATION_SUBMITTED: 'Eligibility Process',
  DOCUMENTS_PENDING: 'Eligibility Process',
  DOCUMENTS_SUBMITTED: 'Eligibility Process',
  INTAKE_APPOINTMENT_SCHEDULED: 'Eligibility Process',
  ELIGIBILITY_UNDER_REVIEW: 'Eligibility Process',
  WIOA_ELIGIBLE: 'Eligibility Process',
  CLOSED_INELIGIBLE: 'Closed',
};

/** Next-step guidance text for the learner activity feed (master-case, eligibility-stage). */
export const WIOA_ELIGIBILITY_STATUS_NEXT_STEP: Record<WioaEligibilityStatus, string> = {
  REGISTERED: 'Your profile is set up — next, we match you to a workforce board.',
  WORKFORCE_BOARD_MATCHED:
    "You're matched — send outreach to your workforce office to open your case.",
  INITIAL_CONTACT_SENT:
    "We've sent your outreach email. Waiting to hear back from your workforce office.",
  AWAITING_RESPONSE:
    'Waiting to hear back from your workforce office. Upload your documents while you wait.',
  ORIENTATION_SCHEDULED: 'Your orientation is scheduled — check the appointment details below.',
  ORIENTATION_COMPLETED:
    'Orientation complete. Next, create a CalJOBS account if you haven’t already.',
  CALJOBS_COMPLETED: 'CalJOBS account created. Next, submit your WIOA application.',
  WIOA_APPLICATION_SUBMITTED:
    'Application submitted. Upload any remaining required documents below.',
  DOCUMENTS_PENDING: 'Upload the required documents below to continue your case.',
  DOCUMENTS_SUBMITTED:
    'All documents submitted — staff will review them and schedule your intake appointment.',
  INTAKE_APPOINTMENT_SCHEDULED:
    'Your intake appointment is scheduled — check the appointment details below.',
  ELIGIBILITY_UNDER_REVIEW: 'Your eligibility is under review by your workforce office.',
  WIOA_ELIGIBLE: "You're WIOA eligible! Pick a course to request training funding.",
  CLOSED_INELIGIBLE: 'This case is closed. Contact NFCAP staff with any questions.',
};

/** Statuses staff can select as the next transition from a given eligibility status — linear, one
 * step forward, except CLOSED_INELIGIBLE which is reachable from any open status
 * (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions"). */
export function nextEligibilityStatusOptions(
  current: WioaEligibilityStatus,
): WioaEligibilityStatus[] {
  if (current === 'CLOSED_INELIGIBLE' || current === 'WIOA_ELIGIBLE') return [];
  const idx = WIOA_ELIGIBILITY_STATUS_ORDER.indexOf(current);
  const forward = WIOA_ELIGIBILITY_STATUS_ORDER[idx + 1];
  const options: WioaEligibilityStatus[] = [];
  if (forward && forward !== 'CLOSED_INELIGIBLE') options.push(forward);
  options.push('CLOSED_INELIGIBLE');
  return options;
}

/// Funding/tuition pipeline (spec Section 14) — per course, only reachable once the learner's
/// master case is WIOA_ELIGIBLE.
export const WIOA_FUNDING_STATUS_ORDER: WioaFundingStatus[] = [
  'ETPL_TRAINING_REQUESTED',
  'TRAINING_AUTHORIZATION_PENDING',
  'TUITION_APPROVED',
  'APPRENTICESHIP_ENROLLMENT_COMPLETE',
  'FUNDING_DECLINED',
];

export const WIOA_FUNDING_STATUS_LABEL: Record<WioaFundingStatus, string> = {
  ETPL_TRAINING_REQUESTED: 'ETPL Training Requested',
  TRAINING_AUTHORIZATION_PENDING: 'Training Authorization Pending',
  TUITION_APPROVED: 'Tuition Approved',
  APPRENTICESHIP_ENROLLMENT_COMPLETE: 'Apprenticeship Enrollment Complete',
  FUNDING_DECLINED: 'Funding Declined',
};

export const WIOA_FUNDING_STATUS_NEXT_STEP: Record<WioaFundingStatus, string> = {
  ETPL_TRAINING_REQUESTED: 'Training funding has been requested for this course.',
  TRAINING_AUTHORIZATION_PENDING: 'Your training authorization is pending approval.',
  TUITION_APPROVED: 'Tuition approved! This course is now unlocked.',
  APPRENTICESHIP_ENROLLMENT_COMPLETE: 'Enrollment complete — this funding request is closed.',
  FUNDING_DECLINED: 'Funding was not approved for this course. Contact NFCAP staff with questions.',
};

export function nextFundingStatusOptions(current: WioaFundingStatus): WioaFundingStatus[] {
  if (current === 'FUNDING_DECLINED' || current === 'APPRENTICESHIP_ENROLLMENT_COMPLETE') return [];
  const idx = WIOA_FUNDING_STATUS_ORDER.indexOf(current);
  const forward = WIOA_FUNDING_STATUS_ORDER[idx + 1];
  const options: WioaFundingStatus[] = [];
  if (forward && forward !== 'FUNDING_DECLINED') options.push(forward);
  options.push('FUNDING_DECLINED');
  return options;
}

/// Back-compat aliases (eligibility side) for UI call sites not yet reworked for the full
/// master/course split (docs/plans/wioa-spec-alignment-kickoff.md #1) — a real UX pass (per
/// DEV-APPROACH.md's mockup-first gate) still needs to separate eligibility vs. funding-stage
/// controls in the Coordinator/Partner case views; these aliases only keep the app compiling and
/// showing the eligibility side correctly in the meantime.
export const WIOA_STATUS_LABEL = WIOA_ELIGIBILITY_STATUS_LABEL;
export const WIOA_STATUS_PHASE = WIOA_ELIGIBILITY_STATUS_PHASE;
export const WIOA_STATUS_NEXT_STEP = WIOA_ELIGIBILITY_STATUS_NEXT_STEP;
export const nextStatusOptions = nextEligibilityStatusOptions;
