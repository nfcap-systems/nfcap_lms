import { prisma } from '@/lib/prisma';

export type EligibilityQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

/** Eligibility Self-Check (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — `disqualifyingIndex` is
 * deliberately not returned here; it's server-only scoring data, same reasoning as never sending
 * a quiz's `correctIndex`... except this codebase already does send QuizQuestion.correctIndex to
 * the client (src/lib/data/courses.ts's mapCourse — quiz scoring is client-trusted by existing
 * design). Eligibility is not: whether someone qualifies for WIOA funding is consequential enough
 * that scoring stays server-side in `submitEligibilityCheck` below, unlike the quiz. */
export async function getEligibilityQuestions(): Promise<EligibilityQuestion[]> {
  const questions = await prisma.eligibilityQuestion.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, prompt: true, options: true },
  });
  return questions;
}
