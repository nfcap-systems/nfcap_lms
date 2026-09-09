import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Migrations and the runtime client both go through DIRECT_URL (Supabase's session pooler,
// IPv4-compatible) — see src/lib/prisma.ts for why. DATABASE_URL (transaction pooler) doesn't
// support the prepared statements/advisory locks `prisma migrate` needs, so it's kept in .env
// for potential future use but isn't wired in anywhere yet.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DIRECT_URL'],
  },
});
