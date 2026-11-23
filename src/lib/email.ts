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

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
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
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
