import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/** Second connection, authenticated as `app_runtime` (non-owner, no BYPASSRLS) instead of the
 * `postgres` role `src/lib/prisma.ts` uses — see docs/build/PHASE_1_DB_ACCESS_DECISION.md. The
 * `postgres` connection bypasses RLS unconditionally, so it must never be used for the WIOA/PII
 * tables the migration in `prisma/migrations/20261105120000_add_rls_wioa_pii` scopes policies to. */
function makeRlsPrisma() {
  const pool = new Pool({
    connectionString: process.env.APP_RUNTIME_DATABASE_URL!,
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
  });
  pool.on('error', (err) => {
    console.error('[rls pool] idle client error:', err.message);
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForRls = globalThis as unknown as { rlsPrisma?: PrismaClient };
export const rlsPrisma = globalForRls.rlsPrisma ?? makeRlsPrisma();
if (process.env.NODE_ENV !== 'production') globalForRls.rlsPrisma = rlsPrisma;

export type SessionContext = { userId: string; role: string };

/** Runs `fn` against the WIOA/PII tables with `app.user_id`/`app.user_role` set for the duration
 * of one transaction, so the RLS policies see the real caller rather than nothing. `set_config`
 * with `is_local = true` is the parameterized equivalent of `SET LOCAL` — unlike `SET`, it binds
 * through Prisma's `$executeRaw` instead of string-interpolating into SQL, and resets
 * automatically at transaction end regardless of commit/rollback.
 *
 * Every call site touching LearnerProfile, WioaCase (+ children), EtplFundingRequest/
 * FundingAuthorization, or EvidenceSubmission must go through this — calling `prisma` (the
 * `postgres`-role client) for those tables skips RLS entirely, silently. */
export async function withRlsContext<T>(
  ctx: SessionContext,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return rlsPrisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId}, true)`;
      await tx.$executeRaw`SELECT set_config('app.user_role', ${ctx.role}, true)`;
      return fn(tx as PrismaClient);
    },
    // Prisma's defaults (maxWait: 2000ms, timeout: 5000ms) are too tight here — a plain
    // connection to Supabase from this environment alone measures ~1.7-2s (see the
    // connectionTimeoutMillis comment on the pool above), so acquiring a pooled connection can
    // occasionally spill past 2000ms under ordinary network jitter, surfacing as Prisma P2028
    // ("Unable to start a transaction in the given time") even though nothing is actually wrong
    // (confirmed: a fresh connection outside this pool starts a transaction fine; pg_stat_activity
    // shows no connection leak). Matches the 20s connectionTimeoutMillis already set above.
    { maxWait: 10_000, timeout: 20_000 },
  );
}
