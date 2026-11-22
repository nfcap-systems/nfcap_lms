'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRole, type Role } from '@/lib/roles';
import { requireAdmin } from './guard';

export type UpdateRoleResult = { error: string } | { success: true };

/** Changes another account's role — the in-app replacement for `scripts/promote-role.ts`
 * (docs/client/NFCAP_LMS_Feature_Detail_Client.md, "Role Management Screen"). Same underlying
 * mechanism the script already used (`app_metadata.role` via the admin API), just reachable from
 * the UI instead of a terminal. */
export async function updateUserRole(userId: string, role: string): Promise<UpdateRoleResult> {
  await requireAdmin();
  if (!isRole(role)) return { error: 'Unknown role.' };

  const supabaseAdmin = createAdminClient();

  // Guards the one genuinely dangerous case: demoting the last remaining Admin would lock
  // everyone out of Admin-only screens (including this one) with no way back short of a
  // developer running the old script again. Any other change — including an Admin demoting
  // themselves while another Admin still exists — is allowed.
  if (role !== 'ADMIN') {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return { error: error.message };
    const admins = data.users.filter((u) => u.app_metadata?.role === 'ADMIN');
    const targetIsAdmin = admins.some((u) => u.id === userId);
    if (targetIsAdmin && admins.length <= 1) {
      return { error: "Can't remove the last remaining Admin." };
    }
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { role: role as Role },
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/roles');
  return { success: true };
}
