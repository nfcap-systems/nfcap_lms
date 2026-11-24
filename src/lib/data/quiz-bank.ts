import { prisma } from '@/lib/prisma';

export type QuizBankCourse = { slug: string; title: string; category: string };

/** ADM09-QuizAuthoring's course filter and attach-target list — narrow select, not courses.ts's
 * courseInclude (CLAUDE.md performance conventions: "do not add new call sites to courseInclude").
 * Only courses with an assessment can have questions attached. */
export async function getCoursesWithAssessment(): Promise<QuizBankCourse[]> {
  return prisma.course.findMany({
    where: { assessment: { isNot: null } },
    orderBy: { pathwayOrder: 'asc' },
    select: { slug: true, title: true, category: true },
  });
}

export type BankQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Every course this question is currently attached to — empty means it's a draft, sitting in
   * the bank unused. The whole screen is one list filtered by this, not a separate "course view"
   * vs. "drafts view" vs. "add from bank" modal. */
  attachedCourses: { slug: string; title: string }[];
};

/** The entire shared question bank, one fetch — filtering (all / unattached / one course) happens
 * client-side in QuizBankView since every question already carries its full attachment list. */
export async function getAllBankQuestions(): Promise<BankQuestion[]> {
  const questions = await prisma.quizQuestion.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      prompt: true,
      options: true,
      correctIndex: true,
      assessments: {
        select: { assessment: { select: { course: { select: { slug: true, title: true } } } } },
      },
    },
  });

  return questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correctIndex,
    attachedCourses: q.assessments.map((a) => a.assessment.course),
  }));
}

export type AssessmentSettings = { passThreshold: number; maxAttempts: number | null };

/** Pass threshold/attempts are per-course Assessment settings, not bank-wide — shown when the
 * list is filtered to one course, not for "All questions"/"Unattached". One query for every
 * course's settings, not one per course selection. */
export async function getAssessmentSettingsByCourse(): Promise<Record<string, AssessmentSettings>> {
  const courses = await prisma.course.findMany({
    where: { assessment: { isNot: null } },
    select: { slug: true, assessment: { select: { passThreshold: true, maxAttempts: true } } },
  });
  return Object.fromEntries(
    courses.filter((c) => c.assessment).map((c) => [c.slug, c.assessment as AssessmentSettings]),
  );
}
