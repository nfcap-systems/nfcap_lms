import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Phase 4 gating verification (docs/build/WIOA_BUILD_WORKFLOW.md — "verified by attempting each
// directly, not just via the hidden Enroll button"). The four enrollment-creating server actions
// (enroll, markLessonComplete, recordQuizAttempt, submitEvidence in src/lib/actions/progress.ts)
// all funnel through getOrCreateEnrollment, whose access gate is: course.access === 'OPEN', or a
// CourseUnlock row exists for (learnerId, courseId). This script exercises that exact gate query
// directly for a learner against every RESTRICTED course and reports LOCKED / UNLOCKED — a script
// can't carry a Supabase session to call the actions themselves, but the gate is the single
// chokepoint they share.
//
// Usage: npm run wioa-verify-gating -- <learnerEmailOrId>
//        npm run wioa-verify-gating                (defaults to the open WIOA case's learner)

const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** Mirrors the RESTRICTED branch of getOrCreateEnrollment in src/lib/actions/progress.ts. */
async function isBlocked(learnerId: string, courseId: string): Promise<boolean> {
  const unlock = await prisma.courseUnlock.findUnique({
    where: { learnerId_courseId: { learnerId, courseId } },
  });
  return !unlock;
}

async function main() {
  const arg = process.argv[2];

  let learnerId: string;
  if (!arg) {
    const c = await prisma.wioaCase.findFirstOrThrow({
      where: { closedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    learnerId = c.learnerId;
  } else if (arg.includes('@')) {
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data } = await supa.auth.admin.listUsers();
    const u = data.users.find((x) => x.email?.toLowerCase() === arg.toLowerCase());
    if (!u) throw new Error(`No account for ${arg}`);
    learnerId = u.id;
  } else {
    learnerId = arg;
  }

  console.log(`Learner: ${learnerId}\n`);

  const courses = await prisma.course.findMany({
    select: { id: true, slug: true, title: true, access: true },
    orderBy: { title: 'asc' },
  });

  for (const course of courses) {
    if (course.access === 'OPEN') {
      console.log(`  OPEN      ${course.title} — self-enrollable, no gate`);
      continue;
    }
    const blocked = await isBlocked(learnerId, course.id);
    const unlock = blocked
      ? null
      : await prisma.courseUnlock.findUnique({
          where: { learnerId_courseId: { learnerId, courseId: course.id } },
        });
    console.log(
      `  ${blocked ? 'LOCKED   ' : 'UNLOCKED '} ${course.title}` +
        (unlock ? ` — CourseUnlock(source=${unlock.source}, grantedBy=${unlock.grantedBy})` : ''),
    );
  }

  console.log(
    `\nLOCKED  => enroll / markLessonComplete / recordQuizAttempt / submitEvidence all throw` +
      `\n           "This course is restricted and has not been unlocked for you yet."`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
