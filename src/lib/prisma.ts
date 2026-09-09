import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function makePrisma() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL!,
    // Supabase free tier caps concurrent connections low — keep this pool small so a single
    // request burst doesn't exhaust the project's connection limit.
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000, // Supabase cold-start can exceed 10s and 500 the first request
    keepAlive: true,
  });
  // Supabase can silently drop an idle pooled connection; without this listener that surfaces
  // as an unhandled 'error' event (crashing the process) instead of the pool evicting the dead
  // client and reconnecting on next query.
  pool.on('error', (err) => {
    console.error('[prisma pool] idle client error:', err.message);
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  // Supabase occasionally resets an in-use (not just idle) pooled connection mid-query, which
  // surfaces as "Connection terminated unexpectedly" rather than the pool's 'error' event above.
  // That's a transient network blip, not a bad query, so retry once against a fresh connection.
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message.includes('Connection terminated unexpectedly') ||
              err.message.includes('Connection terminated due to connection timeout'))
          ) {
            return await query(args);
          }
          throw err;
        }
      },
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
