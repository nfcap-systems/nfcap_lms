'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, listAllUsers } from '@/lib/supabase/admin';
import { isUserActive } from '@/lib/data/users';
import { requireAdmin } from './guard';
import { logAuditEvent } from './audit';
import { unassignPartnerStaffCases } from './wioa';

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
  const actingAdmin = await requireAdmin();
  const admin = createAdminClient();

  // Same guard as updateUserRole (src/lib/actions/roles.ts) and for the same reason: deactivating
  // the last active Admin would lock everyone out of Admin-only screens, including this one.
  let targetRole: string | undefined;
  if (!active) {
    const { users, error } = await listAllUsers(admin);
    if (error) return { error: error.message };
    const activeAdmins = users.filter((u) => u.app_metadata?.role === 'ADMIN' && isUserActive(u));
    const targetIsActiveAdmin = activeAdmins.some((u) => u.id === userId);
    if (targetIsActiveAdmin && activeAdmins.length <= 1) {
      return { error: "Can't deactivate the last remaining active Admin." };
    }
    targetRole = users.find((u) => u.id === userId)?.app_metadata?.role as string | undefined;
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : PERMANENT_BAN_DURATION,
  });
  if (error) return { error: error.message };

  // A deactivated Partner Staff account should orphan nothing: an existing case assignment used
  // to just sit there pointing at someone who can no longer log in to work it, with no flag to
  // the Coordinator. Reactivating deliberately does NOT restore old assignments — the case may
  // already have a new owner by then, so that has to be a deliberate reassignment, not automatic.
  let unassignedCaseCount = 0;
  if (!active && targetRole === 'PARTNER_STAFF') {
    unassignedCaseCount = await unassignPartnerStaffCases(actingAdmin.id, userId);
  }

  // Platform-Wide Audit Trail (src/lib/actions/audit.ts) — disabling/restoring someone's login is
  // exactly the "sensitive activity" that trail exists for; this previously left no record of who
  // deactivated or reactivated an account, or when.
  await logAuditEvent({
    actor: actingAdmin,
    action: active ? 'REACTIVATE_USER' : 'DEACTIVATE_USER',
    targetType: 'User',
    targetId: userId,
    metadata: unassignedCaseCount > 0 ? { unassignedCaseCount } : undefined,
  });

  revalidatePath('/admin/roles');
  return { success: true };
}
