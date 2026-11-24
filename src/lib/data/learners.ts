import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';

export type LearnerRecord = { id: string; name: string; email: string; createdAt: Date };

type AuthUserRecord = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  created_at: string;
};

function toLearnerRecord(user: AuthUserRecord): LearnerRecord {
  const name =
    typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : (user.email ?? 'Learner');
  return { id: user.id, name, email: user.email ?? '', createdAt: new Date(user.created_at) };
}

/** Supabase Auth is the only user store in this app — every roster/name lookup below goes
 * through this one cached listUsers() call instead of each hitting the Auth API separately.
 * Short TTL (cacheComponents is on, but there's no Redis cache handler yet — see next.config.ts
 * — so this lives in the dev server's own in-memory cache per instance) bounds staleness after a
 * signup or role change to ~30s; cacheTag('auth-users') lets any future mutation that changes a
 * role (src/app/admin/roles) call updateTag('auth-users') for an immediate rather than TTL-bound
 * refresh. Prototype scale (a handful of users) means the default single-page listUsers() result
 * is enough; pagination would be needed before this could support a real user base. */
async function listAllAuthUsers(): Promise<AuthUserRecord[]> {
  'use cache';
  cacheLife({ stale: 30, revalidate: 30, expire: 120 });
  cacheTag('auth-users');
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users;
}

/** Admin roster (Admin > Learners). */
export async function getLearnerRoster(): Promise<LearnerRecord[]> {
  const users = await listAllAuthUsers();
  return users
    .filter((u) => u.app_metadata?.role === 'LEARNER')
    .map(toLearnerRecord)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Was its own per-id Supabase Auth getUserById() call — a real N+1 once a caller (getWioaCases)
 * started looking up several ids in a loop. Resolving it from the same cached full list instead
 * turns that into zero additional Auth API calls beyond the one listAllAuthUsers already makes. */
export async function getLearnerById(learnerId: string): Promise<LearnerRecord | undefined> {
  const users = await listAllAuthUsers();
  const user = users.find((u) => u.id === learnerId);
  return user ? toLearnerRecord(user) : undefined;
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
  const users = await listAllAuthUsers();
  return users
    .filter((u) => u.app_metadata?.role === 'PARTNER_STAFF')
    .map(toLearnerRecord)
    .sort((a, b) => a.name.localeCompare(b.name));
}
