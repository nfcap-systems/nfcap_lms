// Sender identity is a fixed placeholder; sending is log-only, never real delivery
// (WIOA_INTEGRATION_PLAN.md Section 6/11).
export const WIOA_SENDER_EMAIL = 'wioa@nfcap.local';

// Seed defaults for WioaEmailTemplate (prisma/seed-wioa-email-template.ts) — the admin-editable
// row at /admin/wioa/email-template is the source of truth once seeded; these constants only
// establish day-one behavior and are the fallback if that row is ever missing.
export const DEFAULT_WIOA_EMAIL_SUBJECT =
  'Request to Begin WIOA Eligibility Process for Apprenticeship Training';

export const DEFAULT_WIOA_EMAIL_BODY = `Hello,

My name is {{learnerName}}, and I reside in {{city}}, {{zip}}.

I am interested in beginning the WIOA eligibility process to determine whether I qualify for WIOA funding for apprenticeship training through NFCAP's "{{courseTitle}}" program.

Please let me know the next steps required to begin the WIOA intake and eligibility process, including any orientation, application, appointment, CalJOBS registration, or documentation I need to complete.

Thank you,
{{learnerName}}
{{learnerPhone}}
{{learnerEmail}}`;

export type WioaEmailPlaceholders = {
  learnerName: string;
  city: string;
  zip: string;
  courseTitle: string;
  learnerEmail: string;
  learnerPhone: string;
};

/** Substitutes the {{token}} placeholders in an admin-edited template (subject or body) — used
 * both client-side (FundingView, once the learner has the template's raw text) and by the seed
 * script's initial row. Unknown tokens are left as-is rather than erroring, since the template
 * text is free-form admin input. */
export function fillWioaEmailTemplate(text: string, params: WioaEmailPlaceholders): string {
  return text.replace(/{{\s*(\w+)\s*}}/g, (match, token: string) => {
    return token in params ? params[token as keyof WioaEmailPlaceholders] : match;
  });
}
