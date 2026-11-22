'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUserActive } from '@/lib/data/users';
import { requireAdmin } from './guard';

export type SetActiveResult = { error: string } | { success: true };

// Supabase has no literal "ban forever" — a long fixed duration is its documented idiom for an
// indefinite ban (its own admin API docs use this exact value as the "ban a user" example).
const PERMANENT_BAN_DURATION = '876000h'; // ~100 years

/** Deactivates or reactivates an account — access ends (or resumes) without touching any of
 * their data (docs/client/NFCAP_LMS_Feature_Detail_Client.md, "User Deactivation & Offboarding":
 * "access ends immediately while their records and credentials are preserved for compliance").
 * Nothing is deleted: `getAuthUser()` (src/lib/supabase/server.ts) always does a live round-trip
 * to Supabase Auth rather than decoding a local JWT, so a ban takes effect on the banned user's
 * very next request rather than waiting for their current token to expire. */
export async function setUserActive(userId: string, active: boolean): Promise<SetActiveResult> {
  await requireAdmin();
  const admin = createAdminClient();

  // Same guard as updateUserRole (src/lib/actions/roles.ts) and for the same reason: deactivating
  // the last active Admin would lock everyone out of Admin-only screens, including this one.
  if (!active) {
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) return { error: error.message };
    const activeAdmins = data.users.filter(
      (u) => u.app_metadata?.role === 'ADMIN' && isUserActive(u),
    );
    const targetIsActiveAdmin = activeAdmins.some((u) => u.id === userId);
    if (targetIsActiveAdmin && activeAdmins.length <= 1) {
      return { error: "Can't deactivate the last remaining active Admin." };
    }
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : PERMANENT_BAN_DURATION,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/roles');
  return { success: true };
}
