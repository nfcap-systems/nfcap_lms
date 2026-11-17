import { prisma } from '@/lib/prisma';

/** Secrets, Environment & Rate Limiting — closes performance finding F9 (no rate limiting
 * anywhere, including /login, /signup, and the 10MB upload action). DB-backed (`RateLimitBucket`,
 * prisma/migrations/20261105130000_pathway_audit_ratelimit) rather than in-memory: the deploy
 * target is 2+ app instances (CLAUDE.md), and an in-memory counter on one instance never sees
 * traffic that landed on another.
 *
 * Fixed-window, not a true sliding log — buckets requests into `windowMs`-wide windows keyed by
 * (identifier, action, windowStart). That's a deliberate precision/cost tradeoff: good enough to
 * stop brute-force/abuse patterns on login, signup, and uploads, and one row per window instead
 * of one row per request. */
export async function checkRateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { identifier_action_windowStart: { identifier, action, windowStart } },
    create: { identifier, action, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

/** Throws a plain Error (caught the same way as any other action-validation failure) instead of
 * returning a result the caller might forget to check. */
export async function enforceRateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const { allowed } = await checkRateLimit(identifier, action, limit, windowMs);
  if (!allowed) {
    throw new Error('Too many attempts. Please wait a few minutes and try again.');
  }
}
