import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Seeds a couple of Cohorts with real members (the seed-demo-learners accounts) so Admin's
// Cohorts board (src/app/admin/cohorts) has content to show and test against — it was built with
// no seed data behind it. Safe to re-run: cohorts are upserted by name, memberships by
// [cohortId, learnerId].
//
// Usage: npm run seed-cohorts
// Requires scripts/seed-demo-learners.ts to have been run first (looks up its accounts by email).

const DEMO_LEARNER_EMAILS = [
  'priya.shah@demo.nfcap.test',
  'casey.nguyen@demo.nfcap.test',
  'diego.alvarez@demo.nfcap.test',
  'marcus.webb@demo.nfcap.test',
];

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const pathway = await prisma.pathway.findFirst({ where: { isDefault: true } });
  if (!pathway) {
    throw new Error('No default Pathway found — run prisma/seed.ts first.');
  }

  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;
  const learnerIdByEmail = new Map(
    list.users
      .filter((u) => u.email && DEMO_LEARNER_EMAILS.includes(u.email.toLowerCase()))
      .map((u) => [u.email!.toLowerCase(), u.id]),
  );
  const missing = DEMO_LEARNER_EMAILS.filter((e) => !learnerIdByEmail.has(e));
  if (missing.length > 0) {
    throw new Error(
      `Missing demo learner accounts: ${missing.join(', ')} — run npm run seed-demo-learners first.`,
    );
  }

  const fallCohort = await upsertCohort({
    name: 'Fall 2026 Flooring Cohort',
    pathwayId: pathway.id,
    startDate: new Date('2026-09-02'),
    endDate: new Date('2027-02-27'),
    memberEmails: DEMO_LEARNER_EMAILS,
    deadlines: [
      { label: 'Safety & Tools evidence due', dueDate: new Date('2026-10-01') },
      { label: 'Full pathway certification due', dueDate: new Date('2027-02-20') },
    ],
  });

  const winterCohort = await upsertCohort({
    name: 'Winter 2027 Flooring Cohort',
    pathwayId: pathway.id,
    startDate: new Date('2027-01-05'),
    endDate: null,
    memberEmails: ['casey.nguyen@demo.nfcap.test', 'diego.alvarez@demo.nfcap.test'],
    deadlines: [{ label: 'Orientation complete', dueDate: new Date('2027-01-19') }],
  });

  console.log(`Seeded cohort: ${fallCohort.name} (${fallCohort.id})`);
  console.log(`Seeded cohort: ${winterCohort.name} (${winterCohort.id})`);

  async function upsertCohort(params: {
    name: string;
    pathwayId: string;
    startDate: Date;
    endDate: Date | null;
    memberEmails: string[];
    deadlines: { label: string; dueDate: Date }[];
  }) {
    const existing = await prisma.cohort.findFirst({ where: { name: params.name } });
    const cohort = existing
      ? await prisma.cohort.update({
          where: { id: existing.id },
          data: {
            pathwayId: params.pathwayId,
            startDate: params.startDate,
            endDate: params.endDate,
          },
        })
      : await prisma.cohort.create({
          data: {
            name: params.name,
            pathwayId: params.pathwayId,
            startDate: params.startDate,
            endDate: params.endDate,
          },
        });

    for (const email of params.memberEmails) {
      const learnerId = learnerIdByEmail.get(email)!;
      await prisma.cohortMembership.upsert({
        where: { cohortId_learnerId: { cohortId: cohort.id, learnerId } },
        update: {},
        create: { cohortId: cohort.id, learnerId },
      });
    }

    const existingDeadlines = await prisma.cohortDeadline.findMany({
      where: { cohortId: cohort.id },
    });
    for (const deadline of params.deadlines) {
      const already = existingDeadlines.find((d) => d.label === deadline.label);
      if (already) continue;
      await prisma.cohortDeadline.create({
        data: { cohortId: cohort.id, label: deadline.label, dueDate: deadline.dueDate },
      });
    }

    return cohort;
  }
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
