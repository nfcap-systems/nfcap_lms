import { type NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getRequestOrigin } from '@/lib/origin';

/** Verifies the token_hash from a Supabase auth email link (password recovery and signup
 * confirmation) and, on success, establishes a real session via cookies before redirecting to
 * `next`. Requires the Supabase "Reset Password"/"Confirm signup" email templates to point here —
 * see docs/build/PHASE_2_PASSWORD_RESET.md for the exact template text and why (the default
 * `{{ .ConfirmationURL }}` template uses a hash-fragment token that only a browser can read; this
 * route needs a server-readable `token_hash` instead).
 *
 * Origin for the `next` redirect comes from getRequestOrigin() (forwarded headers), not
 * `new URL(request.url).origin` — behind the deploy target's Traefik proxy, the latter reflects
 * the container's own internal bind address (`0.0.0.0:3000`), which sent every signup/reset
 * confirmation link's second redirect to `http://0.0.0.0:3000/...` in production instead of the
 * real domain, even after Supabase's own Site URL setting was corrected. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link-expired`);
}
