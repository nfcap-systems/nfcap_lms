import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, '../../.env.test');
const repoRoot = path.resolve(dirname, '../..');

/** Fixed, throwaway credential for the ephemeral test Postgres only (tmpfs-backed locally,
 * recreated per CI run) — not a real secret. The RLS migration
 * (prisma/migrations/20261105120000_add_rls_wioa_pii) deliberately creates `app_runtime` with no
 * password so a real one is never committed; the test DB has no such constraint. Must match
 * APP_RUNTIME_DATABASE_URL in .env.test and .github/workflows/ci.yml. */
const TEST_APP_RUNTIME_PASSWORD = 'test-app-runtime-password';

/** Brings up the test Postgres database and runs migrations against it. Shared by Vitest's and
 * Playwright's global setup so both suites point at the same isolated database. */
export function ensureTestDatabase() {
  const run = (cmd: string) => execSync(cmd, { stdio: 'inherit', env: process.env, cwd: repoRoot });

  // Sets app_runtime's password so src/lib/db/rls.ts's second connection can actually log in —
  // migrate deploy creates the role with LOGIN but no password (see
  // prisma/migrations/20261105120000_add_rls_wioa_pii). Via `prisma db execute` against the
  // plain (postgres-role) connection rather than a migration, since this value must never be
  // committed for the real database. Prisma 7's `db execute` takes no `--url` — it reads the
  // datasource URL prisma.config.ts points at (DIRECT_URL), which .env.test/ci.yml set to the
  // same test database as DATABASE_URL.
  const setAppRuntimePassword = () => {
    const sqlPath = path.join(repoRoot, '.app-runtime-test-password.sql');
    writeFileSync(sqlPath, `ALTER ROLE app_runtime WITH PASSWORD '${TEST_APP_RUNTIME_PASSWORD}';`);
    try {
      run(`npx prisma db execute --file "${sqlPath}"`);
    } finally {
      rmSync(sqlPath, { force: true });
    }
  };

  if (process.env.CI) {
    // CI provides Postgres via a GitHub Actions service container and sets
    // DATABASE_URL/DIRECT_URL/APP_RUNTIME_DATABASE_URL directly in the job env — nothing to
    // start here.
    run('npx prisma migrate deploy');
    setAppRuntimePassword();
    return;
  }

  const { parsed } = dotenv.config({ path: envPath });
  if (!parsed) {
    throw new Error(`Could not load ${envPath} — did you create .env.test?`);
  }
  Object.assign(process.env, parsed);

  const composeFile = path.resolve(repoRoot, 'docker-compose.test.yml');
  // Reuses a container left running from a previous local run.
  run(`docker compose -f "${composeFile}" up -d --wait`);
  run('npx prisma migrate deploy');
  setAppRuntimePassword();
}
