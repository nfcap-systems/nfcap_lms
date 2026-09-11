import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { DEFAULT_WIOA_EMAIL_SUBJECT, DEFAULT_WIOA_EMAIL_BODY } from '../src/lib/wioa/email-template';

// Idempotent like seed-wioa-documents.ts — only seeds the singleton row if none exists yet, so
// it's safe to run again after the admin has already edited the template.
const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const existing = await prisma.wioaEmailTemplate.findFirst();
  if (existing) {
    console.log('Skipping — a WIOA email template already exists.');
    return;
  }

  await prisma.wioaEmailTemplate.create({
    data: { subject: DEFAULT_WIOA_EMAIL_SUBJECT, body: DEFAULT_WIOA_EMAIL_BODY },
  });
  console.log('Seeded the default WIOA outreach email template.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
