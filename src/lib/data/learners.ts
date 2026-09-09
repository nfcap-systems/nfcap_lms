import { createAdminClient } from '@/lib/supabase/admin';

export type LearnerRecord = { id: string; name: string; email: string };

function toLearnerRecord(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): LearnerRecord {
  const name =
    typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : (user.email ?? 'Learner');
  return { id: user.id, name, email: user.email ?? '' };
}

/** Admin roster (Admin > Learners) — Supabase Auth is the only user store in this app, so the
 * roster comes from the admin API rather than a database table. Prototype scale (a handful of
 * learners) means the default single-page listUsers() result is enough; pagination would be
 * needed before this could support a real learner base. */
export async function getLearnerRoster(): Promise<LearnerRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users
    .filter((u) => u.app_metadata?.role === 'LEARNER')
    .map(toLearnerRecord)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLearnerById(learnerId: string): Promise<LearnerRecord | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(learnerId);
  if (error || !data.user) return undefined;
  return toLearnerRecord(data.user);
}

/** Every PARTNER_STAFF account, for the Coordinator dashboard's case-assignment dropdown
 * (docs/build/WIOA_BUILD_WORKFLOW.md Phase 3). Same prototype-scale assumption as getLearnerRoster. */
export async function getPartnerStaffRoster(): Promise<LearnerRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users
    .filter((u) => u.app_metadata?.role === 'PARTNER_STAFF')
    .map(toLearnerRecord)
    .sort((a, b) => a.name.localeCompare(b.name));
}
