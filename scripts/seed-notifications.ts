import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client';
import type { NotificationType } from '../src/generated/prisma/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Seeds Notification rows for manual QC of NOTIF-1's two panels (LRN18-NotificationsPanel,
// ADM18-NotificationsPanel) against real list/empty/read-unread states. NOTIF-2 (the first real
// emitter) doesn't exist yet, so nothing else in the app produces these rows today — this script
// is the only way to see a non-empty panel before NOTIF-2 ships. Safe to re-run: clears each
// target user's existing rows first rather than accumulating duplicates.
//
// Usage: npm run seed-notifications
// Requires scripts/seed-demo-learners.ts and scripts/seed-wioa-staff.ts to have been run first.

type SeedRow = {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  minutesAgo: number;
};

const LEARNER_ROWS: SeedRow[] = [
  {
    type: 'EVIDENCE_REVIEWED',
    title: 'Evidence reviewed',
    body: 'Your evidence for "Tile Installation" was reviewed — one criterion needs resubmission.',
    link: '/learner/courses/tile-installation/evidence',
    read: false,
    minutesAgo: 20,
  },
  {
    type: 'DEADLINE_UPCOMING',
    title: 'Document deadline coming up',
    body: 'Your WIOA case has a document due soon — check your funding page.',
    link: '/learner/funding',
    read: false,
    minutesAgo: 180,
  },
  {
    type: 'CASE_STATUS_CHANGED',
    title: 'Funding case updated',
    body: 'Your WIOA case moved to Eligibility Under Review.',
    link: '/learner/funding',
    read: true,
    minutesAgo: 1500,
  },
];

const STAFF_ROWS: SeedRow[] = [
  {
    type: 'CASE_STATUS_CHANGED',
    title: 'Document re-uploaded',
    body: 'A learner re-uploaded a rejected document — ready for review.',
    link: '/coordinator',
    read: false,
    minutesAgo: 10,
  },
  {
    type: 'MESSAGE_RECEIVED',
    title: 'New message',
    body: 'A learner sent a message about their funding case.',
    read: false,
    minutesAgo: 45,
  },
  {
    type: 'COHORT_UPDATE',
    title: 'Cohort milestone reached',
    body: 'A cohort crossed 75% completion on Flooring Fundamentals.',
    read: false,
    minutesAgo: 90,
  },
  {
    type: 'ANNOUNCEMENT_PUBLISHED',
    title: 'New announcement published',
    body: 'An announcement went out to all learners in the Tile Installation pathway.',
    read: true,
    minutesAgo: 2000,
  },
];

const TARGETS: { email: string; rows: SeedRow[] }[] = [
  { email: 'learner@nfcap.demo', rows: LEARNER_ROWS },
  { email: 'coordinator@demo.nfcap.test', rows: STAFF_ROWS },
];

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  for (const target of TARGETS) {
    const user = list.users.find((u) => u.email?.toLowerCase() === target.email);
    if (!user) {
      console.warn(`Skipping ${target.email} — account not found.`);
      continue;
    }

    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.notification.createMany({
      data: target.rows.map((row) => ({
        userId: user.id,
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
        readAt: row.read ? new Date(Date.now() - row.minutesAgo * 60_000) : null,
        createdAt: new Date(Date.now() - row.minutesAgo * 60_000),
      })),
    });
    console.log(`Seeded ${target.rows.length} notifications for ${target.email}.`);
  }

  console.log('\nNotifications seed complete.');
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
