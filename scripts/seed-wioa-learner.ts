import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Creates a demo WIOA learner with a LearnerProfile whose ZIP matches a seeded jurisdiction
// (prisma/seed-wioa.ts), so /learner/funding shows a real matched office and can open a case.
// fundingSource = WIOA_PENDING so the Funding nav area appears. Safe to re-run (upserts).
//
// Usage:
//   npm run seed-wioa-learner
//   npm run seed-wioa-learner -- you@example.com 92105 Receiving
//     arg2 = ZIP (must be a seeded jurisdiction), arg3 = unemploymentInsuranceStatus
//     (anything other than "Not applicable" makes the EDD Award Letter appear in the checklist)

const DEMO_PASSWORD = 'Demo1234!';

const email = process.argv[2] ?? 'wioa.learner@demo.nfcap.test';
const zip = process.argv[3] ?? '90007'; // Los Angeles County WDB
const uiStatus = process.argv[4] ?? 'Not applicable';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const name = email.split('@')[0];

  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let learnerId: string;
  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      app_metadata: { role: 'LEARNER' },
      user_metadata: { name },
    });
    learnerId = existing.id;
    console.log(`Reusing account ${email}`);
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { role: 'LEARNER' },
    });
    if (error) throw error;
    learnerId = data.user.id;
    console.log(`Created account ${email} — password: ${DEMO_PASSWORD}`);
  }

  const jurisdiction = await prisma.workforceJurisdiction.findFirst({
    where: { zip, active: true },
    include: { workforceBoard: true },
  });
  if (!jurisdiction) {
    console.error(
      `\nWARNING: ZIP ${zip} has no seeded jurisdiction — run npm run prisma:seed-wioa`,
    );
  } else {
    console.log(`ZIP ${zip} -> ${jurisdiction.workforceBoard.name}`);
  }

  const profileData = {
    streetAddress: '123 Demo St',
    city: jurisdiction?.city ?? 'Los Angeles',
    state: 'CA',
    zip,
    preferredLanguage: 'English',
    employmentStatus: 'Unemployed',
    unemploymentInsuranceStatus: uiStatus,
    trainingApprenticeshipInterest: 'Flooring apprenticeship',
    fundingSource: 'WIOA_PENDING' as const,
    dateOfBirth: new Date('1995-06-15'),
    mobilePhone: '(213) 555-0199',
  };

  await prisma.learnerProfile.upsert({
    where: { learnerId },
    create: { learnerId, ...profileData },
    update: profileData,
  });

  console.log(
    `\nWIOA learner ready: ${email} / ${DEMO_PASSWORD}` +
      `\n  ZIP ${zip}, unemploymentInsuranceStatus="${uiStatus}"` +
      `\n  EDD Award Letter in checklist: ${uiStatus !== 'Not applicable' ? 'yes' : 'no'}`,
  );
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
