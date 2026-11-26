import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

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

/** Pages through every Supabase Auth user instead of stopping at the first page `listUsers()`
 * returns by default (50) — needed wherever code counts or searches the *entire* user base for a
 * safety check, e.g. the last-Admin guards in src/lib/actions/roles.ts and users.ts. Those guards
 * silently seeing only page 1 could mean an admin sitting on a later page goes uncounted, letting
 * an unsafe demotion/deactivation through instead of being blocked. Same `{ data: { users },
 * error }`-shaped-ish return as a single `listUsers()` call (just `users`/`error` directly, no
 * pagination metadata — nothing here needs it) so existing `if (error) return { error:
 * error.message }` call sites barely change. */
export async function listAllUsers(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ users: User[]; error: null } | { users: null; error: { message: string } }> {
  const perPage = 1000;
  let page = 1;
  const all: User[] = [];
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return { users: null, error };
    all.push(...data.users);
    if (!data.nextPage) break;
    page = data.nextPage;
  }
  return { users: all, error: null };
}
