import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client';
import { EvidenceStatus as PrismaEvidenceStatus } from '../src/generated/prisma/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { WIOA_ELIGIBILITY_STATUS_ORDER, WIOA_FUNDING_STATUS_ORDER } from '../src/lib/wioa/status';

// Two realistic demo learners for presentations — a WIOA-funded one and a self-pay one, each
// with enough real course/evidence/funding data to look like an actual trainee rather than a
// bare login. Replaces the old 4-learner + 1-wioa-learner set (priya.shah, casey.nguyen,
// diego.alvarez, marcus.webb, wioa.learner@demo.nfcap.test), which had accumulated alongside 40+
// leftover E2E test accounts as exactly the kind of "idle, not in use" clutter this session was
// asked to clean up.
//
// Usage: npm run seed-demo-learners
// Login: learner@nfcap.demo (WIOA-funded) / learner2@nfcap.demo (self-pay), password Demo1234!

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
  /** How a RESTRICTED course became accessible — omitted for OPEN courses. */
  unlockSource?: 'WIOA_FUNDING' | 'ADMIN_ASSIGNMENT';
};

type DemoLearner = { email: string; name: string; courses: DemoCourseProgress[] };

const demoLearners: DemoLearner[] = [
  {
    // WIOA-funded — safety-tools/flooring-fundamentals done with certificates, and
    // tile-installation (RESTRICTED) in progress, unlocked by the funded WioaCase seeded below.
    email: 'learner@nfcap.demo',
    name: 'Jordan Lee',
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
        completedLessons: 2,
        unlockSource: 'WIOA_FUNDING',
      },
    ],
  },
  {
    // Self-pay — same two OPEN courses completed, tile-installation unlocked by an admin
    // assignment instead of a funding case, with a pending evidence submission in progress.
    email: 'learner2@nfcap.demo',
    name: 'Morgan Diaz',
    courses: [
      {
        slug: 'safety-tools',
        completedLessons: 'all',
        quiz: { scorePercent: 100, passed: true },
        evidence: {
          description:
            'Photo of full PPE (hard hat, safety glasses, gloves) and a clear, taped-off work area on the Miller Ave job site.',
          fileName: 'miller-ave-ppe.jpg',
          status: 'approved',
        },
      },
      {
        slug: 'flooring-fundamentals',
        completedLessons: 'all',
        quiz: { scorePercent: 90, passed: true },
        evidence: {
          description:
            'Subfloor prep and flatness check on a 200 sq ft living room before plank installation.',
          fileName: 'living-room-subfloor.jpg',
          status: 'approved',
        },
      },
      {
        slug: 'tile-installation',
        completedLessons: 'all',
        quiz: { scorePercent: 80, passed: true },
        evidence: {
          description: 'Tile layout photo from the Harrison St bathroom remodel.',
          fileName: 'harrison-st-tile.jpg',
          status: 'pending',
        },
        unlockSource: 'ADMIN_ASSIGNMENT',
      },
    ],
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

// certificateCode has its own unique constraint (Certificate_certificateCode_key) — must be
// unique per learner, not just per course, or a second learner completing the same course
// collides on create (Prisma's upsert below only keys on enrollmentId, which differs).
function buildCertificateCode(learnerId: string, courseSlug: string): string {
  return `NFCAP-${courseSlug.toUpperCase().replace(/[^A-Z0-9]/g, '-')}-${learnerId.slice(0, 8).toUpperCase()}`;
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

  // A real learner only ever reaches this course's progress (lessons/quiz/evidence) through a
  // real unlock — WIOA funding approval or an admin grant (CourseUnlock, granted alongside
  // Enrollment in those flows). Without one here, the learner views in src/app/learner/* now
  // correctly gate on `unlocked`, so a RESTRICTED course with seeded progress but no grant
  // renders as Locked everywhere — including for courses already completed below.
  if (course.access === 'RESTRICTED') {
    await prisma.courseUnlock.upsert({
      where: { learnerId_courseId: { learnerId, courseId: course.id } },
      update: {},
      create: {
        learnerId,
        courseId: course.id,
        source: entry.unlockSource ?? 'ADMIN_ASSIGNMENT',
        grantedBy: 'seed-demo-learners-script',
      },
    });
  }

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
          certificateCode: buildCertificateCode(learnerId, entry.slug),
        },
      });
    }
  }
}

/** Gives the WIOA-funded demo learner a real, fully-funded case for `tile-installation` —
 * matched board/AJCC/contact, a document checklist marked ACCEPTED, status history walked all
 * the way to TUITION_APPROVED (the funded threshold — src/lib/data/wioa.ts's
 * FUNDED_CASE_STATUSES), an EtplFundingRequest + FundingAuthorization with a real approved
 * amount, an upcoming appointment, and an outreach-log entry. Mirrors the shape
 * sendWioaOutreach/advanceWioaCaseStatus build at runtime (src/lib/actions/wioa.ts), written
 * directly via Prisma since those are Server Actions tied to a live request/session. */
async function seedFundedWioaCase(learnerId: string): Promise<void> {
  const course = await prisma.course.findUniqueOrThrow({ where: { slug: 'tile-installation' } });

  const jurisdiction = await prisma.workforceJurisdiction.findFirst({
    where: { zip: '94544', active: true },
    include: { workforceBoard: true, ajccCenter: true },
  });
  if (!jurisdiction) {
    console.warn('WARNING: ZIP 94544 has no seeded jurisdiction — run npm run prisma:seed-wioa');
  }
  const contact = jurisdiction
    ? await prisma.workforceContact.findFirst({
        where: { workforceBoardId: jurisdiction.workforceBoardId, contactType: 'PRIMARY' },
      })
    : null;

  await prisma.learnerProfile.upsert({
    where: { learnerId },
    create: {
      learnerId,
      streetAddress: '456 Demo Ave',
      city: jurisdiction?.city ?? 'Hayward',
      state: 'CA',
      zip: '94544',
      preferredLanguage: 'English',
      employmentStatus: 'Unemployed',
      unemploymentInsuranceStatus: 'Not applicable',
      trainingApprenticeshipInterest: 'Flooring apprenticeship',
      fundingSource: 'WIOA_PENDING',
      dateOfBirth: new Date('1997-03-10'),
      mobilePhone: '(510) 555-0142',
    },
    update: { fundingSource: 'WIOA_PENDING' },
  });

  // Master case first (docs/plans/wioa-spec-alignment-kickoff.md #1) — mirrors
  // findOrCreateMasterCase in src/lib/actions/wioa.ts.
  const masterCase = await prisma.wioaCase.upsert({
    where: { learnerId },
    create: {
      learnerId,
      workforceBoardId: jurisdiction?.workforceBoardId,
      ajccCenterId: jurisdiction?.ajccCenterId ?? undefined,
      contactId: contact?.id,
    },
    update: {},
  });

  // Walk the master case's eligibility pipeline to WIOA_ELIGIBLE, logging one history row per
  // step (docs/plans/wioa-spec-alignment-kickoff.md #1, full split).
  const eligibilityFromIdx = WIOA_ELIGIBILITY_STATUS_ORDER.indexOf(masterCase.status);
  const eligibilityToIdx = WIOA_ELIGIBILITY_STATUS_ORDER.indexOf('WIOA_ELIGIBLE');
  if (eligibilityToIdx > eligibilityFromIdx) {
    const steps = WIOA_ELIGIBILITY_STATUS_ORDER.slice(eligibilityFromIdx + 1, eligibilityToIdx + 1);
    for (const status of steps) {
      await prisma.wioaCase.update({ where: { id: masterCase.id }, data: { status } });
      await prisma.wioaStatusHistory.create({
        data: { masterCaseId: masterCase.id, status, changedBy: 'seed-demo-learners-script' },
      });
    }
  }

  if (jurisdiction) {
    const requirements = await prisma.wioaDocumentRequirement.findMany({
      where: { workforceBoardId: jurisdiction.workforceBoardId, conditional: false },
    });
    for (const req of requirements) {
      await prisma.wioaDocument.upsert({
        where: { masterCaseId_requirementId: { masterCaseId: masterCase.id, requirementId: req.id } },
        update: {},
        create: {
          masterCaseId: masterCase.id,
          requirementId: req.id,
          fileName: `${req.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
          status: 'ACCEPTED',
          uploadedAt: new Date(),
          reviewedBy: 'seed-demo-learners-script',
          reviewedAt: new Date(),
        },
      });
    }
  }

  let courseCase = await prisma.wioaCourseCase.findFirst({
    where: { learnerId, courseId: course.id, closedAt: null },
  });
  if (!courseCase) {
    courseCase = await prisma.wioaCourseCase.create({
      data: { learnerId, courseId: course.id, masterCaseId: masterCase.id },
    });
    await prisma.wioaFundingStatusHistory.create({
      data: {
        courseCaseId: courseCase.id,
        status: 'ETPL_TRAINING_REQUESTED',
        changedBy: 'seed-demo-learners-script',
      },
    });
  }

  // Walk the course-case forward to the funded threshold, logging one history row per step.
  const fundingFromIdx = WIOA_FUNDING_STATUS_ORDER.indexOf(courseCase.status);
  const fundingToIdx = WIOA_FUNDING_STATUS_ORDER.indexOf('TUITION_APPROVED');
  if (fundingToIdx > fundingFromIdx) {
    const steps = WIOA_FUNDING_STATUS_ORDER.slice(fundingFromIdx + 1, fundingToIdx + 1).filter(
      (s) => s !== 'FUNDING_DECLINED',
    );
    for (const status of steps) {
      await prisma.wioaCourseCase.update({ where: { id: courseCase.id }, data: { status } });
      await prisma.wioaFundingStatusHistory.create({
        data: { courseCaseId: courseCase.id, status, changedBy: 'seed-demo-learners-script' },
      });
    }
  }

  const fundingRequest = await prisma.etplFundingRequest.upsert({
    where: { wioaCaseId: courseCase.id },
    update: {},
    create: {
      wioaCaseId: courseCase.id,
      trainingProgram: 'Tile Installation — NFCAP Flooring Apprenticeship',
      etplProviderConfirmed: true,
      submittedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      caseManagerNotifiedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      fundingReviewStatus: 'Approved',
      status: 'Approved',
    },
  });
  await prisma.fundingAuthorization.upsert({
    where: { fundingRequestId: fundingRequest.id },
    update: {},
    create: {
      fundingRequestId: fundingRequest.id,
      itaIssuedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      approvedAmount: 4200,
      approvalDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      trainingStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'Approved',
    },
  });

  const hasAppointment = await prisma.appointment.findFirst({
    where: { courseCaseId: courseCase.id },
  });
  if (!hasAppointment) {
    await prisma.appointment.create({
      data: {
        masterCaseId: masterCase.id,
        courseCaseId: courseCase.id,
        type: 'FOLLOWUP',
        scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        notes: 'Check in on training progress and tuition disbursement.',
      },
    });
  }

  const hasCommunication = await prisma.wioaCommunication.findFirst({
    where: { learnerId, courseCaseId: courseCase.id },
  });
  if (!hasCommunication) {
    await prisma.wioaCommunication.create({
      data: {
        learnerId,
        masterCaseId: masterCase.id,
        courseCaseId: courseCase.id,
        courseId: course.id,
        contactId: contact?.id,
        channel: 'EMAIL',
        recipient: 'learner@nfcap.demo',
        subject: 'Your WIOA funding has been approved',
        body: 'Good news — your tuition for Tile Installation has been approved and training has started. Reach out with any questions.',
        sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

async function main() {
  for (const learner of demoLearners) {
    const learnerId = await upsertAuthUser(learner.email, learner.name);
    for (const courseEntry of learner.courses) {
      await seedLearnerCourse(learnerId, courseEntry);
    }
    if (learner.email === 'learner@nfcap.demo') {
      await seedFundedWioaCase(learnerId);
    } else {
      await prisma.learnerProfile.upsert({
        where: { learnerId },
        create: {
          learnerId,
          city: 'Oakland',
          state: 'CA',
          fundingSource: 'SELF_PAY',
        },
        update: { fundingSource: 'SELF_PAY' },
      });
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
