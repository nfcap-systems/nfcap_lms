import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { isRole, type Role } from '@/lib/roles';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies — middleware refreshes
            // the session on the next request instead.
          }
        },
      },
    },
  );
}

export type { Role };

/** The signed-in user, or null. `supabase.auth.getUser()` is a real round-trip to the Supabase
 * Auth server (it revalidates the session, unlike decoding a local JWT) — React's cache() dedupes
 * repeated calls within the same request/render so multiple server-side reads share one call. */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export function getRole(user: User | null): Role | null {
  const role = user?.app_metadata?.role;
  return isRole(role) ? role : null;
}
