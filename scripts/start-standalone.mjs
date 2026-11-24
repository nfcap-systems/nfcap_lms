// Runs the `output: 'standalone'` server build (next.config.ts) the same way the Dockerfile does:
// `next start` refuses to run under standalone output, and the standalone server.js expects
// `public` and `.next/static` copied in next to it — see Dockerfile's COPY lines for the same
// three steps. Used by playwright.config.ts's webServer so E2E exercises the real deploy shape.
import { cpSync } from 'node:fs';
import { spawn } from 'node:child_process';

const port = process.argv[2] ?? process.env.PORT ?? '3000';

cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });

const child = spawn('node', ['.next/standalone/server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
});

child.on('exit', (code) => process.exit(code ?? 0));
