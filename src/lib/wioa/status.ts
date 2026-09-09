import type { WioaCaseStatus } from '@/generated/prisma/enums';

/** The 18 canonical statuses in transition order (spec Section 7), grouped into the 6 UI phases
 * the reference visual and WIOA_INTEGRATION_PLAN.md Section 7/8 use for the student-facing
 * progress display. CLOSED_INELIGIBLE is reachable from any open status (not part of the linear
 * order) and is rendered as its own terminal phase, not folded into "Enrollment". */
export const WIOA_UI_PHASES = [
  'Registration',
  'Matching',
  'Contact',
  'Eligibility Process',
  'Funding Request',
  'Enrollment',
] as const;

export type WioaUiPhase = (typeof WIOA_UI_PHASES)[number] | 'Closed';

export const WIOA_STATUS_ORDER: WioaCaseStatus[] = [
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
  'ETPL_TRAINING_REQUESTED',
  'TRAINING_AUTHORIZATION_PENDING',
  'TUITION_APPROVED',
  'APPRENTICESHIP_ENROLLMENT_COMPLETE',
  'CLOSED_INELIGIBLE',
];

export const WIOA_STATUS_LABEL: Record<WioaCaseStatus, string> = {
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
  ETPL_TRAINING_REQUESTED: 'ETPL Training Requested',
  TRAINING_AUTHORIZATION_PENDING: 'Training Authorization Pending',
  TUITION_APPROVED: 'Tuition Approved',
  APPRENTICESHIP_ENROLLMENT_COMPLETE: 'Apprenticeship Enrollment Complete',
  CLOSED_INELIGIBLE: 'Closed / Ineligible',
};

export const WIOA_STATUS_PHASE: Record<WioaCaseStatus, WioaUiPhase> = {
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
  ETPL_TRAINING_REQUESTED: 'Funding Request',
  TRAINING_AUTHORIZATION_PENDING: 'Funding Request',
  TUITION_APPROVED: 'Funding Request',
  APPRENTICESHIP_ENROLLMENT_COMPLETE: 'Enrollment',
  CLOSED_INELIGIBLE: 'Closed',
};

/** Next-step guidance text for the learner activity feed (WIOA_INTEGRATION_PLAN.md Section 7 —
 * "next-step guidance (derived from WioaCase.status)"). */
export const WIOA_STATUS_NEXT_STEP: Record<WioaCaseStatus, string> = {
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
  WIOA_ELIGIBLE: "You're WIOA eligible! Staff will request ETPL training funding next.",
  ETPL_TRAINING_REQUESTED: 'Training funding has been requested for your apprenticeship program.',
  TRAINING_AUTHORIZATION_PENDING: 'Your training authorization is pending approval.',
  TUITION_APPROVED: 'Tuition approved! Your restricted course is now unlocked.',
  APPRENTICESHIP_ENROLLMENT_COMPLETE: 'Enrollment complete — your WIOA case is closed.',
  CLOSED_INELIGIBLE: 'This case is closed. Contact NFCAP staff with any questions.',
};

/** Statuses staff can select as the next transition from a given status — linear, one step
 * forward, except CLOSED_INELIGIBLE which is reachable from any open status
 * (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions"). */
export function nextStatusOptions(current: WioaCaseStatus): WioaCaseStatus[] {
  if (current === 'CLOSED_INELIGIBLE' || current === 'APPRENTICESHIP_ENROLLMENT_COMPLETE')
    return [];
  const idx = WIOA_STATUS_ORDER.indexOf(current);
  const forward = WIOA_STATUS_ORDER[idx + 1];
  const options: WioaCaseStatus[] = [];
  if (forward && forward !== 'CLOSED_INELIGIBLE') options.push(forward);
  options.push('CLOSED_INELIGIBLE');
  return options;
}
