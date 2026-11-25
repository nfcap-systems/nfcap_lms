import { Resend } from 'resend';

/** Transactional Email Infrastructure (docs/client/NFCAP_LMS_Feature_Detail_Client.md) — the
 * app's own send path for email it triggers directly (e.g. a future case-status notification).
 * Supabase Auth's own emails (password reset, email verification) go through Supabase's Auth →
 * SMTP settings instead, pointed at Resend separately — this module doesn't send those.
 *
 * EMAIL_FROM defaults to Resend's shared sandbox address (`onboarding@resend.dev`), which needs
 * no domain verification but can only reliably deliver to the Resend account's own verified
 * email until a real NFCAP sending subdomain is verified. Swap EMAIL_FROM once that's done — no
 * code change needed. */

const MAX_SEND_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Outreach Email Delivery & Deliverability (docs/client/NFCAP_LMS_Feature_Detail_Client.md: "with
 * delivery failures surfaced rather than silent"). Resend's own errors don't distinguish
 * transient (rate limit, timeout) from permanent (invalid address, account issue) failures in a
 * machine-checkable way here, so this retries every failure a bounded number of times with a
 * short fixed delay rather than trying to classify them — cheap, and still bounded so a genuinely
 * permanent failure fails fast instead of hanging the caller. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  /** Where a human reply should land — e.g. the learner's own address on a workforce-board
   * outreach email sent from NFCAP's address, so a reply reaches the student, not NFCAP. */
  replyTo?: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipped sending "${params.subject}" to ${params.to}`,
    );
    return;
  }

  // Constructed lazily, not at module scope — the Resend constructor throws immediately when
  // the key is missing/undefined, which was crashing any test file that merely imported this
  // module (even indirectly) in an environment with no RESEND_API_KEY, before sendEmail was ever
  // called.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'NFCAP <onboarding@resend.dev>';

  let lastMessage = 'Unknown error';
  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    if (!error) return;
    lastMessage = error.message;
    if (attempt < MAX_SEND_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
  }
  throw new Error(`Failed to send email after ${MAX_SEND_ATTEMPTS} attempts: ${lastMessage}`);
}
