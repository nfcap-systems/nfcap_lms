// Interim outreach email template (docs/build/WIOA_BUILD_WORKFLOW.md "Open decisions" — Phase 1 has no
// admin-managed templates yet, that's Section 11 deferred work). Sender identity is a fixed
// placeholder; sending is log-only, never real delivery (WIOA_INTEGRATION_PLAN.md Section 6/11).
export const WIOA_SENDER_EMAIL = 'wioa@nfcap.local';

export const WIOA_EMAIL_SUBJECT = 'Request to Begin WIOA Eligibility Process for Apprenticeship Training';

export function buildWioaEmailBody(params: {
  learnerName: string;
  city: string;
  zip: string;
  courseTitle: string;
  learnerEmail: string;
  learnerPhone: string;
}): string {
  const { learnerName, city, zip, courseTitle, learnerEmail, learnerPhone } = params;
  return `Hello,

My name is ${learnerName}, and I reside in ${city}, ${zip}.

I am interested in beginning the WIOA eligibility process to determine whether I qualify for WIOA funding for apprenticeship training through NFCAP's "${courseTitle}" program.

Please let me know the next steps required to begin the WIOA intake and eligibility process, including any orientation, application, appointment, CalJOBS registration, or documentation I need to complete.

Thank you,
${learnerName}
${learnerPhone}
${learnerEmail}`;
}
