import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client';
import { EvidenceStatus as PrismaEvidenceStatus } from '../src/generated/prisma/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { uploadEvidenceFile } from '../src/lib/supabase/evidence-storage';

// Seeds pending, per-criterion EvidenceSubmissions with REAL uploaded photos (not just a filename
// label like seed-demo-learners.ts's legacy-shape rows), so Admin's Review Queue
// (src/app/admin/reviews) has rows to review and ADM12-PhotoAnnotation
// (src/components/admin/PhotoAnnotationDialog.tsx) has an actual image to annotate —
// CriterionAssessment.learnerFilePath must point at a real object in the evidence-files bucket,
// which nothing else seeds today. Safe to re-run: skips an enrollment that already has a PENDING
// submission rather than creating duplicates.
//
// Usage: npm run seed-review-queue
// Requires scripts/seed-demo-learners.ts to have been run first (uses its accounts + courses).

type ReviewQueueEntry = {
  learnerEmail: string;
  courseSlug: string;
  /** Local file under public/images/learner to upload as each criterion's photo. */
  photoFile: string;
};

const ENTRIES: ReviewQueueEntry[] = [
  {
    learnerEmail: 'learner@nfcap.demo',
    courseSlug: 'tile-installation',
    photoFile: 'tile-installation.jpg',
  },
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

  for (const entry of ENTRIES) {
    const learner = list.users.find((u) => u.email?.toLowerCase() === entry.learnerEmail);
    if (!learner) {
      console.warn(`Skipping ${entry.learnerEmail} — account not found. Run seed-demo-learners first.`);
      continue;
    }

    const course = await prisma.course.findUniqueOrThrow({
      where: { slug: entry.courseSlug },
    });

    // Same unlock grant as seed-demo-learners.ts — a RESTRICTED course needs a CourseUnlock or
    // every learner page gates this learner out before they'd ever reach the review-triggering
    // routes in real use.
    if (course.access === 'RESTRICTED') {
      await prisma.courseUnlock.upsert({
        where: { learnerId_courseId: { learnerId: learner.id, courseId: course.id } },
        update: {},
        create: {
          learnerId: learner.id,
          courseId: course.id,
          source: 'ADMIN_ASSIGNMENT',
          grantedBy: 'seed-review-queue-script',
        },
      });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: { learnerId_courseId: { learnerId: learner.id, courseId: course.id } },
      update: {},
      create: { learnerId: learner.id, courseId: course.id },
    });

    const existingPending = await prisma.evidenceSubmission.findFirst({
      where: { enrollmentId: enrollment.id, status: PrismaEvidenceStatus.PENDING },
    });
    if (existingPending) {
      console.log(
        `Skipping ${entry.learnerEmail} / ${entry.courseSlug} — already has a pending submission (${existingPending.id}).`,
      );
      continue;
    }

    const criteria = await prisma.assessmentCriterion.findMany({
      where: { courseId: course.id },
      orderBy: { order: 'asc' },
    });
    if (criteria.length === 0) {
      console.warn(`Skipping ${entry.courseSlug} — no AssessmentCriterion rows to attach evidence to.`);
      continue;
    }

    const photoPath = path.join(process.cwd(), 'public', 'images', 'learner', entry.photoFile);
    const buffer = await readFile(photoPath);

    const submission = await prisma.evidenceSubmission.create({
      data: { enrollmentId: enrollment.id, description: '', status: PrismaEvidenceStatus.PENDING },
    });

    for (const criterion of criteria) {
      let learnerFilePath: string | undefined;
      let learnerFileName: string | undefined;
      // Only photo-required criteria get an uploaded image — matches the real learner capture
      // flow, which only requires (and only accepts) a photo when the criterion demands one.
      if (criterion.photoRequired) {
        learnerFileName = entry.photoFile;
        learnerFilePath = `${learner.id}/${enrollment.id}/${criterion.id}/${Date.now()}-${entry.photoFile}`;
        const file = new File([buffer], entry.photoFile, { type: 'image/jpeg' });
        await uploadEvidenceFile(learnerFilePath, file);
      }
      await prisma.criterionAssessment.create({
        data: {
          evidenceSubmissionId: submission.id,
          criterionId: criterion.id,
          learnerFilePath,
          learnerFileName,
          learnerDescription: criterion.photoRequired
            ? null
            : `Seed test note for "${criterion.title}".`,
          submittedAt: new Date(),
          // met left null — unreviewed, same state a real learner submission starts in.
        },
      });
    }

    console.log(
      `Seeded pending review: ${entry.learnerEmail} / ${entry.courseSlug} (${criteria.length} criteria, submission ${submission.id})`,
    );
  }

  console.log('\nReview queue seed complete. Log in as admin@demo.nfcap.test to review.');
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
