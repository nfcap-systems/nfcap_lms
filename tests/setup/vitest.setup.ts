import { afterEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';

// Server actions call revalidatePath/revalidateTag as a side effect; outside a real Next request
// context those throw, so every unit test gets a no-op stub rather than mocking it per file.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Server actions gate on getAuthUser()/getRole() (src/lib/actions/guard.ts) which otherwise read
// real cookies() — not available outside a Next request. Tests set the current user via
// tests/setup/auth-mock.ts's mockAuthUser() instead of exercising real Supabase auth.
vi.mock('@/lib/supabase/server', () => ({
  getAuthUser: vi.fn(),
  getRole: vi.fn(),
}));

afterEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
});
