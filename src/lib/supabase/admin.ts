import { createClient } from '@supabase/supabase-js';

/** Service-role client — bypasses all auth rules. Server-only; never import this from a Client
 * Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser. Used for admin-only operations
 * Supabase doesn't expose to a normal session: listing all users (admin roster), stamping
 * app_metadata.role on signup/promotion. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
