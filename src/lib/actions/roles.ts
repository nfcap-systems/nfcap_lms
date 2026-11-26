'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, listAllUsers } from '@/lib/supabase/admin';
import { isRole, type Role } from '@/lib/roles';
import { requireAdmin } from './guard';
import { logAuditEvent } from './audit';
import { unassignPartnerStaffCases } from './wioa';

export type UpdateRoleResult = { error: string } | { success: true };

/** Changes another account's role — the in-app replacement for `scripts/promote-role.ts`
 * (docs/client/NFCAP_LMS_Feature_Detail_Client.md, "Role Management Screen"). Same underlying
 * mechanism the script already used (`app_metadata.role` via the admin API), just reachable from
 * the UI instead of a terminal. */
export async function updateUserRole(userId: string, role: string): Promise<UpdateRoleResult> {
  const admin = await requireAdmin();
  if (!isRole(role)) return { error: 'Unknown role.' };

  const supabaseAdmin = createAdminClient();

  const { data: targetData, error: targetError } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  if (targetError) return { error: targetError.message };
  const previousRole = targetData.user.app_metadata?.role as string | undefined;

  // Learners are a permanently separate pool, not a staff-track starting point — NFCAP decision,
  // 2026-11-26. Checked against the account's real current role, not just what the UI happens to
  // show, so this can't be bypassed by a crafted request either.
  if (previousRole === 'LEARNER') {
    return { error: "A Learner's role can't be changed." };
  }

  // Guards the one genuinely dangerous case: demoting the last remaining Admin would lock
  // everyone out of Admin-only screens (including this one) with no way back short of a
  // developer running the old script again. Any other change — including an Admin demoting
  // themselves while another Admin still exists — is allowed.
  if (role !== 'ADMIN') {
    const { users, error } = await listAllUsers(supabaseAdmin);
    if (error) return { error: error.message };
    const admins = users.filter((u) => u.app_metadata?.role === 'ADMIN');
    const targetIsAdmin = admins.some((u) => u.id === userId);
    if (targetIsAdmin && admins.length <= 1) {
      return { error: "Can't remove the last remaining Admin." };
    }
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { role: role as Role },
  });
  if (error) return { error: error.message };

  // Losing PARTNER_STAFF status should orphan nothing: an existing case assignment used to just
  // sit there pointing at someone who can no longer open /partner to act on it, with no flag to
  // the Coordinator. Folded into this same audit entry rather than a second log call.
  let unassignedCaseCount = 0;
  if (previousRole === 'PARTNER_STAFF' && role !== 'PARTNER_STAFF') {
    unassignedCaseCount = await unassignPartnerStaffCases(admin.id, userId);
  }

  // Platform-Wide Audit Trail (src/lib/actions/audit.ts) — granting/revoking role access is
  // exactly the "sensitive activity" that trail exists for; this previously left no record of
  // who changed a role or when.
  await logAuditEvent({
    actor: admin,
    action: 'UPDATE_USER_ROLE',
    targetType: 'User',
    targetId: userId,
    metadata: { previousRole, newRole: role, unassignedCaseCount },
  });

  revalidatePath('/admin/roles');
  return { success: true };
}
