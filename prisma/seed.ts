import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Standalone client for the seed script (not src/lib/prisma.ts's app-runtime singleton) — this
// runs once via `npx tsx prisma/seed.ts`, outside the Next.js process.
const pool = new Pool({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type SeedQuestion = { prompt: string; options: string[]; correctIndex: number };
type SeedLesson = {
  title: string;
  type: 'VIDEO' | 'TEXT' | 'IMAGE' | 'RESOURCE';
  durationMinutes: number;
  body: string;
  src?: string;
  resourceLabel?: string;
};
type SeedSection = { title: string; lessons: SeedLesson[] };
type SeedCourse = {
  slug: string;
  title: string;
  description: string;
  category: string;
  access: 'OPEN' | 'RESTRICTED';
  pathwayOrder: number;
  evidencePrompt: string;
  passThreshold: number;
  questions: SeedQuestion[];
  sections: SeedSection[];
};

// Transcribed from src/lib/mock-data.ts (docs/product/PRODUCT_CONTEXT.md Section 5/8: one apprenticeship
// pathway made of multiple courses). Kept as the literal seed data source now that mock-data.ts
// is being retired in favor of real DB rows.
const courses: SeedCourse[] = [
  {
    slug: 'safety-tools',
    title: 'Safety & Tools',
    description:
      'Job-site safety fundamentals and the hand and power tools used throughout the flooring trade.',
    category: 'Foundations',
    access: 'OPEN',
    pathwayOrder: 1,
    evidencePrompt:
      'Submit a photo and short description showing correct PPE use and a clear, hazard-free work area on an active or practice job site.',
    passThreshold: 0.75,
    questions: [
      {
        prompt: 'What should you do first if you spot a hazard on the job site?',
        options: [
          'Finish your current task, then mention it at lunch',
          'Report it immediately to your supervisor',
          'Move it yourself without telling anyone',
          'Ignore it if it isn’t blocking your work area',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Which of these is required PPE knowledge under OSHA basics for flooring crews?',
        options: [
          'PPE is optional if the job is running behind schedule',
          'Walkways can be blocked temporarily by tools and material',
          'You are responsible for wearing required PPE and reporting hazards',
          'Only your supervisor is responsible for job-site safety',
        ],
        correctIndex: 2,
      },
      {
        prompt: 'A tool used for cutting flooring material and scoring lines is the:',
        options: ['Tapping block', 'Utility knife', 'Pull bar', 'Chalk line'],
        correctIndex: 1,
      },
      {
        prompt: 'Before operating any powered equipment on site, you should:',
        options: [
          'Skip the checklist if the tool was used yesterday',
          'Complete the pre-use power tool safety checklist',
          'Only check the power cord',
          'Wait for a coworker to check it for you',
        ],
        correctIndex: 1,
      },
    ],
    sections: [
      {
        title: 'Job-Site Safety',
        lessons: [
          {
            title: 'PPE & Hazard Awareness',
            type: 'VIDEO',
            durationMinutes: 8,
            src: 'https://example.com/video/ppe-hazard-awareness.mp4',
            body: 'Overview of required personal protective equipment and how to spot common job-site hazards before they cause injury.',
          },
          {
            title: 'OSHA Basics for Flooring Crews',
            type: 'TEXT',
            durationMinutes: 6,
            body: 'OSHA sets minimum safety standards for construction sites. As a flooring apprentice, you are responsible for wearing required PPE, reporting hazards immediately, keeping walkways clear of tools and material, and following lockout/tagout procedures around any powered equipment. Your site supervisor will walk through site-specific rules on your first day, but these baseline responsibilities apply on every job.',
          },
          {
            title: 'Safety Signage Reference',
            type: 'IMAGE',
            durationMinutes: 3,
            src: 'https://example.com/images/safety-signage-reference.png',
            body: 'Common warning, mandatory, and prohibition signage you will encounter on active job sites.',
          },
        ],
      },
      {
        title: 'Hand & Power Tools',
        lessons: [
          {
            title: 'Essential Hand Tools',
            type: 'TEXT',
            durationMinutes: 7,
            body: 'A flooring apprentice’s starter kit typically includes a utility knife, chalk line, tape measure, notched trowel, tapping block, pull bar, and knee pads. Each tool has a specific role in layout, cutting, and installation — later lessons cover technique for each.',
          },
          {
            title: 'Power Tool Safety Checklist',
            type: 'RESOURCE',
            durationMinutes: 4,
            src: 'https://example.com/resources/power-tool-safety-checklist.pdf',
            resourceLabel: 'Power Tool Safety Checklist.pdf',
            body: 'Printable pre-use checklist for saws, nailers, and floor grinders. Review before operating any powered equipment on site.',
          },
        ],
      },
    ],
  },
  {
    slug: 'flooring-fundamentals',
    title: 'Flooring Fundamentals',
    description:
      'Core concepts every flooring installer needs: subfloor prep, moisture testing, and material handling.',
    category: 'Foundations',
    access: 'OPEN',
    pathwayOrder: 2,
    evidencePrompt:
      'Submit a photo and short description of a subfloor you assessed, including how you checked flatness and moisture before installation.',
    passThreshold: 0.75,
    questions: [
      {
        prompt: 'What should be assessed before any flooring installation begins?',
        options: [
          'Only the room’s paint color',
          'Subfloor flatness, moisture, and structural soundness',
          'The homeowner’s furniture layout',
          'The manufacturer’s warranty terms',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Which method reads relative humidity directly from within the slab?',
        options: [
          'Calcium chloride test',
          'Relative humidity probe',
          'Visual inspection',
          'Tape measure',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Why must wood and laminate flooring acclimate before installation?',
        options: [
          'To match the temperature and humidity of the install environment and prevent buckling/gapping',
          'To make the material easier to cut',
          'It is only a cosmetic recommendation',
          'To reduce shipping weight',
        ],
        correctIndex: 0,
      },
      {
        prompt: 'Correct material handling primarily helps prevent:',
        options: [
          'Slower delivery times',
          'Damage to flooring material before it reaches the subfloor',
          'Increased material cost',
          'Changes to the room’s layout',
        ],
        correctIndex: 1,
      },
    ],
    sections: [
      {
        title: 'Subfloor Preparation',
        lessons: [
          {
            title: 'Reading a Subfloor',
            type: 'VIDEO',
            durationMinutes: 10,
            src: 'https://example.com/video/reading-a-subfloor.mp4',
            body: 'How to assess subfloor flatness, moisture, and structural soundness before any installation begins.',
          },
          {
            title: 'Moisture Testing Methods',
            type: 'TEXT',
            durationMinutes: 6,
            body: 'Excess subfloor moisture is one of the leading causes of flooring failure. Calcium chloride tests, relative humidity probes, and moisture meters each have different use cases — this lesson compares when to use each method and how to read the results against manufacturer thresholds.',
          },
        ],
      },
      {
        title: 'Material Handling',
        lessons: [
          {
            title: 'Acclimating Flooring Materials',
            type: 'TEXT',
            durationMinutes: 5,
            body: 'Wood and laminate flooring must acclimate to the installation environment’s temperature and humidity for the manufacturer-specified period before installation — skipping this step is a common cause of buckling and gapping after install.',
          },
          {
            title: 'Material Handling Reference',
            type: 'IMAGE',
            durationMinutes: 3,
            src: 'https://example.com/images/material-handling-reference.png',
            body: 'Correct stacking, storage, and carrying technique to avoid damaging flooring material before it reaches the subfloor.',
          },
        ],
      },
    ],
  },
  {
    slug: 'tile-installation',
    title: 'Tile Installation',
    description:
      'Layout, setting, and finishing techniques for ceramic and porcelain tile installation.',
    category: 'Trade Skills',
    access: 'RESTRICTED',
    pathwayOrder: 3,
    evidencePrompt:
      'Submit a photo and short description of a tile layout or setting job you completed, noting the trowel size and pattern used.',
    passThreshold: 0.75,
    questions: [
      {
        prompt: 'Before applying thinset, you should first:',
        options: [
          'Establish reference lines and dry-fit the layout',
          'Mix a double batch of thinset',
          'Grout the first row',
          'Remove all reference marks from the floor',
        ],
        correctIndex: 0,
      },
      {
        prompt: 'When calculating material needs, you should factor in:',
        options: [
          'Only the exact square footage with no waste allowance',
          'Waste percentage for the chosen pattern',
          'The tile manufacturer’s stock ticker',
          'The homeowner’s moving date',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Full thinset coverage depends most on:',
        options: [
          'Grout color selection',
          'Correct trowel notch size and angle for the tile format',
          'Room temperature only',
          'The brand of tile spacers used',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'Grout cure time and sealing guidance should be based on:',
        options: [
          'A general rule of thumb regardless of product',
          'The grouting reference guide for the products used',
          'How the tile looks after one hour',
          'The next crew’s schedule only',
        ],
        correctIndex: 1,
      },
    ],
    sections: [
      {
        title: 'Layout & Planning',
        lessons: [
          {
            title: 'Establishing a Tile Layout',
            type: 'VIDEO',
            durationMinutes: 9,
            src: 'https://example.com/video/establishing-a-tile-layout.mp4',
            body: 'Finding your reference lines and dry-fitting a layout before any thinset goes down.',
          },
          {
            title: 'Calculating Material Needs',
            type: 'TEXT',
            durationMinutes: 5,
            body: 'How to calculate square footage, factor in waste percentage for the pattern chosen, and order enough tile, thinset, and grout for the job.',
          },
        ],
      },
      {
        title: 'Setting & Finishing',
        lessons: [
          {
            title: 'Trowel Technique & Coverage',
            type: 'VIDEO',
            durationMinutes: 11,
            src: 'https://example.com/video/trowel-technique-and-coverage.mp4',
            body: 'Achieving full thinset coverage with correct trowel notch size and angle for the tile format being set.',
          },
          {
            title: 'Grouting Reference Guide',
            type: 'RESOURCE',
            durationMinutes: 4,
            src: 'https://example.com/resources/grouting-reference-guide.pdf',
            resourceLabel: 'Grouting Reference Guide.pdf',
            body: 'Cure times, grout selection, and sealing guidance for common tile installations.',
          },
        ],
      },
    ],
  },
  {
    slug: 'professionalism',
    title: 'Professionalism',
    description:
      'Workplace conduct, client communication, and the expectations of a working flooring professional.',
    category: 'Career Readiness',
    access: 'RESTRICTED',
    pathwayOrder: 4,
    evidencePrompt:
      'Submit a short description of a client interaction or on-site situation where you applied professional communication or reliability.',
    passThreshold: 0.75,
    questions: [
      {
        prompt: 'When a project is running behind schedule, you should:',
        options: [
          'Say nothing until the client asks',
          'Communicate the delay proactively and set clear expectations',
          'Blame another trade on the job site',
          'Speed up by skipping safety steps',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'One of the most valued traits on a crew is:',
        options: [
          'Working alone whenever possible',
          'Reliability',
          'Speed over quality',
          'Avoiding client contact',
        ],
        correctIndex: 1,
      },
      {
        prompt: 'If you need to be absent from a scheduled shift, you should:',
        options: [
          'Communicate the absence in advance when possible',
          'Not show up and explain later if asked',
          'Send a coworker in your place without telling anyone',
          'Wait until the next shift to mention it',
        ],
        correctIndex: 0,
      },
      {
        prompt: 'Respecting the schedules of other trades on a shared job site means:',
        options: [
          'Working around their access needs and timelines',
          'Prioritizing your own schedule at all times',
          'Only relevant on large commercial jobs',
          'Not part of a flooring installer’s responsibility',
        ],
        correctIndex: 0,
      },
    ],
    sections: [
      {
        title: 'On the Job',
        lessons: [
          {
            title: 'Client Communication Basics',
            type: 'VIDEO',
            durationMinutes: 7,
            src: 'https://example.com/video/client-communication-basics.mp4',
            body: 'Setting expectations, communicating delays, and handling on-site questions professionally.',
          },
          {
            title: 'Time & Attendance Expectations',
            type: 'TEXT',
            durationMinutes: 4,
            body: 'Reliability is one of the most valued traits on a crew. This lesson covers what employers expect around punctuality, communicating absences, and respecting the schedules of other trades on a shared job site.',
          },
        ],
      },
    ],
  },
];

async function main() {
  for (const c of courses) {
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        description: c.description,
        category: c.category,
        access: c.access,
        pathwayOrder: c.pathwayOrder,
        evidencePrompt: c.evidencePrompt,
      },
      create: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        category: c.category,
        access: c.access,
        pathwayOrder: c.pathwayOrder,
        evidencePrompt: c.evidencePrompt,
      },
    });

    // Idempotent re-runs: wipe and recreate this course's curriculum/assessment rather than
    // trying to diff section/lesson/question lists — simplest correct approach for a seed script.
    await prisma.section.deleteMany({ where: { courseId: course.id } });
    await prisma.assessment.deleteMany({ where: { courseId: course.id } });

    for (const [sectionIndex, section] of c.sections.entries()) {
      await prisma.section.create({
        data: {
          courseId: course.id,
          title: section.title,
          order: sectionIndex,
          lessons: {
            create: section.lessons.map((lesson, lessonIndex) => ({
              title: lesson.title,
              type: lesson.type,
              durationMinutes: lesson.durationMinutes,
              body: lesson.body,
              src: lesson.src,
              resourceLabel: lesson.resourceLabel,
              order: lessonIndex,
            })),
          },
        },
      });
    }

    await prisma.assessment.create({
      data: {
        courseId: course.id,
        passThreshold: c.passThreshold,
        questions: {
          create: c.questions.map((q, questionIndex) => ({
            prompt: q.prompt,
            options: q.options,
            correctIndex: q.correctIndex,
            order: questionIndex,
          })),
        },
      },
    });

    console.log(`Seeded course: ${c.title} (${c.slug})`);
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
