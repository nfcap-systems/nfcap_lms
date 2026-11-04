import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, '../../.env.test');
const repoRoot = path.resolve(dirname, '../..');

/** Brings up the test Postgres database and runs migrations against it. Shared by Vitest's and
 * Playwright's global setup so both suites point at the same isolated database. */
export function ensureTestDatabase() {
  const run = (cmd: string) => execSync(cmd, { stdio: 'inherit', env: process.env, cwd: repoRoot });

  if (process.env.CI) {
    // CI provides Postgres via a GitHub Actions service container and sets
    // DATABASE_URL/DIRECT_URL directly in the job env — nothing to start here.
    run('npx prisma migrate deploy');
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
}
