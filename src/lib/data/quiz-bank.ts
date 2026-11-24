import { prisma } from '@/lib/prisma';

export type QuizBankCourse = { slug: string; title: string; category: string };

/** ADM09-QuizAuthoring's course selector — narrow select, not courses.ts's courseInclude
 * (CLAUDE.md performance conventions: "do not add new call sites to courseInclude"). Only
 * courses with an assessment can have questions. */
export async function getCoursesWithAssessment(): Promise<QuizBankCourse[]> {
  const courses = await prisma.course.findMany({
    where: { assessment: { isNot: null } },
    orderBy: { pathwayOrder: 'asc' },
    select: { slug: true, title: true, category: true },
  });
  return courses;
}

export type QuizBankQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type QuizBankDetail = {
  courseTitle: string;
  passThreshold: number;
  maxAttempts: number | null;
  questions: QuizBankQuestion[];
};

/** Same narrow-select rationale as getCoursesWithAssessment — the question-authoring view only
 * needs one course's own assessment, not the full Course payload CurriculumBuilderView's page
 * already fetches via courseInclude. Reuses that file's addQuestion/updateQuestion/deleteQuestion
 * actions rather than duplicating the write side. */
export async function getQuizBankForCourse(courseSlug: string): Promise<QuizBankDetail | null> {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: {
      title: true,
      assessment: {
        select: {
          passThreshold: true,
          maxAttempts: true,
          questions: {
            orderBy: { order: 'asc' },
            select: { id: true, prompt: true, options: true, correctIndex: true },
          },
        },
      },
    },
  });
  if (!course?.assessment) return null;

  return {
    courseTitle: course.title,
    passThreshold: course.assessment.passThreshold,
    maxAttempts: course.assessment.maxAttempts,
    questions: course.assessment.questions,
  };
}
