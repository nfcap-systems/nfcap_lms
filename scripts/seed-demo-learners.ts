import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client';
import { EvidenceStatus as PrismaEvidenceStatus } from '../src/generated/prisma/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Reproduces the five learner journey stages the old mock progress-store.tsx SEED_STATE used to
// demo (fully certified, pending review, needs resubmission, barely started) as real Supabase
// accounts + database rows, so Admin's dashboard/roster have realistic content to show instead
// of just whoever has actually signed up. Safe to re-run — every step upserts.
//
// Usage: npm run seed-demo-learners
// Demo login: any email below, password "Demo1234!" (documented in README.md).

const DEMO_PASSWORD = 'Demo1234!';

type DemoCourseProgress = {
  slug: string;
  /** 'all' completes every lesson in the course; a number completes just the first N. */
  completedLessons: 'all' | number;
  quiz?: { scorePercent: number; passed: boolean };
  evidence?: {
    description: string;
    fileName?: string;
    status: 'pending' | 'approved' | 'rejected';
  };
};

type DemoLearner = { email: string; name: string; courses: DemoCourseProgress[] };

const demoLearners: DemoLearner[] = [
  {
    email: 'priya.shah@demo.nfcap.test',
    name: 'Priya Shah',
    courses: [
      {
        slug: 'safety-tools',
        completedLessons: 'all',
        quiz: { scorePercent: 100, passed: true },
        evidence: {
          description:
            'Photo of full PPE and a clear, taped-off work area at the start of a job-site shift, with a walkthrough of the hazards I checked for first.',
          fileName: 'jobsite-ppe-checklist.jpg',
          status: 'approved',
        },
      },
      {
        slug: 'flooring-fundamentals',
        completedLessons: 'all',
        quiz: { scorePercent: 100, passed: true },
        evidence: {
          description:
            'Subfloor moisture test on a slab-on-grade job — calcium chloride test plus a visual flatness check before installation.',
          fileName: 'subfloor-moisture-test.jpg',
          status: 'approved',
        },
      },
      {
        slug: 'tile-installation',
        completedLessons: 'all',
        quiz: { scorePercent: 75, passed: true },
        evidence: {
          description:
            'Tile layout and setting on a 120 sq ft bathroom floor, 12x24 porcelain in a running-bond pattern, 1/4" square-notch trowel.',
          fileName: 'bathroom-tile-install.jpg',
          status: 'approved',
        },
      },
      {
        slug: 'professionalism',
        completedLessons: 'all',
        quiz: { scorePercent: 100, passed: true },
        evidence: {
          description:
            'Proactively flagged a two-day material delay to the client and proposed a revised schedule before they had to ask.',
          status: 'approved',
        },
      },
    ],
  },
  {
    email: 'casey.nguyen@demo.nfcap.test',
    name: 'Casey Nguyen',
    courses: [
      {
        slug: 'safety-tools',
        completedLessons: 'all',
        quiz: { scorePercent: 100, passed: true },
        evidence: {
          description:
            'Photo of full PPE (hard hat, safety glasses, gloves) and a clear, taped-off work area on the Miller Ave job site.',
          fileName: 'miller-ave-ppe.jpg',
          status: 'pending',
        },
      },
      { slug: 'flooring-fundamentals', completedLessons: 1 },
    ],
  },
  {
    email: 'diego.alvarez@demo.nfcap.test',
    name: 'Diego Alvarez',
    courses: [
      {
        slug: 'safety-tools',
        completedLessons: 'all',
        quiz: { scorePercent: 75, passed: true },
        evidence: {
          description: 'Job site photo from the Elm Street project.',
          fileName: 'elm-street.jpg',
          status: 'rejected',
        },
      },
      { slug: 'flooring-fundamentals', completedLessons: 2 },
    ],
  },
  {
    email: 'marcus.webb@demo.nfcap.test',
    name: 'Marcus Webb',
    courses: [{ slug: 'safety-tools', completedLessons: 1 }],
  },
];

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);
const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function buildCertificateCode(courseSlug: string): string {
  return `NFCAP-${courseSlug.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
}

async function upsertAuthUser(email: string, name: string): Promise<string> {
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      app_metadata: { role: 'LEARNER' },
    });
    return existing.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role: 'LEARNER' },
  });
  if (error) throw error;
  return data.user.id;
}

async function seedLearnerCourse(learnerId: string, entry: DemoCourseProgress): Promise<void> {
  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: entry.slug },
    include: {
      sections: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
    },
  });
  const allLessons = course.sections.flatMap((s) => s.lessons);
  const lessonsToComplete =
    entry.completedLessons === 'all' ? allLessons : allLessons.slice(0, entry.completedLessons);

  const enrollment = await prisma.enrollment.upsert({
    where: { learnerId_courseId: { learnerId, courseId: course.id } },
    update: {},
    create: { learnerId, courseId: course.id },
  });

  for (const lesson of lessonsToComplete) {
    await prisma.completedLesson.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
      update: {},
      create: { enrollmentId: enrollment.id, lessonId: lesson.id },
    });
  }

  if (entry.quiz) {
    const hasAttempt = await prisma.quizAttempt.findFirst({
      where: { enrollmentId: enrollment.id },
    });
    if (!hasAttempt) {
      await prisma.quizAttempt.create({
        data: {
          enrollmentId: enrollment.id,
          scorePercent: entry.quiz.scorePercent,
          passed: entry.quiz.passed,
        },
      });
    }
  }

  if (entry.evidence) {
    let evidence = await prisma.evidenceSubmission.findFirst({
      where: { enrollmentId: enrollment.id },
    });
    if (!evidence) {
      evidence = await prisma.evidenceSubmission.create({
        data: {
          enrollmentId: enrollment.id,
          description: entry.evidence.description,
          fileName: entry.evidence.fileName,
          status:
            PrismaEvidenceStatus[
              entry.evidence.status.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED'
            ],
          statusUpdatedAt: entry.evidence.status === 'pending' ? null : new Date(),
        },
      });
    }
    if (entry.evidence.status === 'approved') {
      await prisma.certificate.upsert({
        where: { enrollmentId: enrollment.id },
        update: {},
        create: {
          enrollmentId: enrollment.id,
          evidenceSubmissionId: evidence.id,
          certificateCode: buildCertificateCode(entry.slug),
        },
      });
    }
  }
}

async function main() {
  for (const learner of demoLearners) {
    const learnerId = await upsertAuthUser(learner.email, learner.name);
    for (const courseEntry of learner.courses) {
      await seedLearnerCourse(learnerId, courseEntry);
    }
    console.log(`Seeded demo learner: ${learner.name} (${learner.email})`);
  }
  console.log(`\nAll demo accounts use password: ${DEMO_PASSWORD}`);
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
