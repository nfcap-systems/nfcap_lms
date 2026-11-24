import { createAdminClient } from '@/lib/supabase/admin';
import { isRole, type Role } from '@/lib/roles';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  active: boolean;
  emailConfirmed: boolean;
};

/** Supabase's `banned_until` is how this app represents "deactivated" (docs/client/
 * NFCAP_LMS_Feature_Detail_Client.md, "User Deactivation & Offboarding") — there's no separate
 * Postgres `active` flag for users, same as there's no Postgres `User` table at all. A future
 * date means still banned; absent or past means active again. */
export function isUserActive(user: { banned_until?: string | null }): boolean {
  if (!user.banned_until) return true;
  return new Date(user.banned_until).getTime() <= Date.now();
}

/** Admin roster for the Role Management screen — every account regardless of role, unlike
 * `getLearnerRoster`/`getPartnerStaffRoster` (src/lib/data/learners.ts), which each filter to one
 * role for a narrower use case. Supabase Auth is the only user store in this app (no Postgres
 * `User` table), so this comes from the admin API; same prototype-scale assumption as those two —
 * the default single-page `listUsers()` result is enough until there's a real user base. */
export async function getAllUsersWithRoles(): Promise<UserRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;

  return data.users
    .map((u) => {
      const name =
        typeof u.user_metadata?.name === 'string' ? u.user_metadata.name : (u.email ?? 'Unnamed');
      const role = isRole(u.app_metadata?.role) ? u.app_metadata.role : null;
      return {
        id: u.id,
        name,
        email: u.email ?? '',
        role,
        active: isUserActive(u),
        emailConfirmed: Boolean(u.email_confirmed_at),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
