import { type NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/** Verifies the token_hash from a Supabase auth email link (password recovery today; email
 * verification will reuse this once that feature lands) and, on success, establishes a real
 * session via cookies before redirecting to `next`. Requires the Supabase "Reset Password" email
 * template to point here — see docs/build/PHASE_2_PASSWORD_RESET.md for the exact template
 * text and why (the default `{{ .ConfirmationURL }}` template uses a hash-fragment token that
 * only a browser can read; this route needs a server-readable `token_hash` instead). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
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
