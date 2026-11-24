import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';

export type LearnerRecord = { id: string; name: string; email: string; createdAt: Date };

function toLearnerRecord(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at: string;
}): LearnerRecord {
  const name =
    typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : (user.email ?? 'Learner');
  return { id: user.id, name, email: user.email ?? '', createdAt: new Date(user.created_at) };
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

/** Shareable Verified Portfolio (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — resolves a public
 * share token (`generatePortfolioShareToken` in src/lib/actions/portfolio.ts) to the owning
 * learner's id, or `undefined` for an unknown/revoked token. The caller (a future public
 * portfolio page) is responsible for distinguishing nothing further than "not found" — same
 * minimal-disclosure reasoning as getPublicCredentialBySlug in src/lib/data/credentials.ts. */
export async function getLearnerIdByPortfolioShareToken(
  token: string,
): Promise<string | undefined> {
  const profile = await prisma.learnerProfile.findUnique({
    where: { portfolioShareToken: token },
    select: { learnerId: true },
  });
  return profile?.learnerId;
}

/** The learner's own current share token, for `/learner/portfolio` to render "Stop sharing" (and
 * the real link) instead of only ever offering "Copy share link" — `null` when nothing's shared. */
export async function getPortfolioShareToken(learnerId: string): Promise<string | null> {
  const profile = await prisma.learnerProfile.findUnique({
    where: { learnerId },
    select: { portfolioShareToken: true },
  });
  return profile?.portfolioShareToken ?? null;
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
