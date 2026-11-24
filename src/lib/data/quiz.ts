import { prisma } from '@/lib/prisma';

export type QuizAttemptQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type QuizForAttempt = {
  assessmentId: string;
  passThreshold: number;
  maxAttempts: number | null;
  questions: QuizAttemptQuestion[];
};

/** Fisher-Yates — deterministic bias-free shuffle, not `Array.sort(() => Math.random() - 0.5)`
 * (that comparator is not a valid total order and skews toward certain permutations). */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Quiz Engine Depth (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — a dedicated, narrowly-selected
 * fetch (CLAUDE.md performance conventions: "do not add new call sites to courseInclude") rather
 * than reusing src/lib/data/courses.ts's full course payload, which already embeds every
 * question regardless of pool size. When `questionsPerAttempt` is set, draws that many at
 * random from the full bank; `randomizeOrder` shuffles the drawn set. Both null/false reproduce
 * today's existing behavior exactly (every question, fixed order) for every assessment that
 * hasn't opted into the new fields. Quiz scoring stays client-trusted, same as before
 * (src/lib/data/courses.ts's mapCourse already sends `correctIndex` to the client) — this
 * function only changes which/how-many questions reach the client, not the trust model.
 *
 * No UI wired to this yet — LRN04/05's restructure into discrete overview/player/quiz screens
 * (plan Decision 2026-11-24) is what would call it; the current combined course-player screen
 * still reads the full set via getCourseBySlug. */
export async function getQuizForAttempt(courseSlug: string): Promise<QuizForAttempt | null> {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: {
      assessment: {
        select: {
          id: true,
          passThreshold: true,
          questionsPerAttempt: true,
          randomizeOrder: true,
          maxAttempts: true,
          questions: { orderBy: { order: 'asc' }, include: { question: true } },
        },
      },
    },
  });
  if (!course?.assessment) return null;

  const { assessment } = course;
  let pool = assessment.questions.map((link) => link.question);
  if (assessment.questionsPerAttempt !== null && assessment.questionsPerAttempt < pool.length) {
    pool = shuffle(pool).slice(0, assessment.questionsPerAttempt);
  }
  if (assessment.randomizeOrder) {
    pool = shuffle(pool);
  }

  return {
    assessmentId: assessment.id,
    passThreshold: assessment.passThreshold,
    maxAttempts: assessment.maxAttempts,
    questions: pool.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
    })),
  };
}
