'use server';

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';

/** Eligibility Self-Check (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — LRN10b, reachable before
 * signup, so `learnerId` is whoever is signed in or `null` for an anonymous visitor (the model's
 * own nullable `learnerId`, design doc). Scored server-side: a `disqualifyingIndex` answer on
 * any question fails the whole check. Rate-limited by IP-or-session the same way other
 * unauthenticated-reachable actions are (src/lib/rate-limit.ts), since this has no signed-in
 * user to key on for an anonymous submission. No UI wired to this yet (LRN10b has no route,
 * Layer 3A). */
export async function submitEligibilityCheck(
  answers: Record<string, number>,
  rateLimitKey: string,
): Promise<{ eligible: boolean }> {
  await enforceRateLimit(rateLimitKey, 'eligibility-check', 10, 15 * 60 * 1000);

  const questions = await prisma.eligibilityQuestion.findMany({
    select: { id: true, disqualifyingIndex: true },
  });

  const eligible = questions.every((q) => {
    const answerIndex = answers[q.id];
    if (q.disqualifyingIndex === null || q.disqualifyingIndex === undefined) return true;
    return answerIndex !== q.disqualifyingIndex;
  });

  const user = await getAuthUser();
  await prisma.eligibilityCheckResult.create({
    data: { learnerId: user?.id ?? null, answers, eligible },
  });

  return { eligible };
}
