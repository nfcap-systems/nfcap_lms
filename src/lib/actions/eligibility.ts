'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';

/** Same `x-forwarded-for`-first derivation as src/lib/actions/auth.ts's getOrigin, for the one
 * case here that has no email/user id to key rate-limiting on: an anonymous submission. */
async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
}

/** Eligibility Self-Check (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — LRN10b, reachable before
 * signup, so `learnerId` is whoever is signed in or `null` for an anonymous visitor (the model's
 * own nullable `learnerId`, design doc). Scored server-side: a `disqualifyingIndex` answer on
 * any question fails the whole check. Rate-limited by the signed-in user's id when there is one,
 * else by IP — the caller never needs to supply a key. */
export async function submitEligibilityCheck(
  answers: Record<string, number>,
): Promise<{ eligible: boolean }> {
  const user = await getAuthUser();
  const rateLimitKey = user?.id ?? (await getClientIp());
  await enforceRateLimit(rateLimitKey, 'eligibility-check', 10, 15 * 60 * 1000);

  const questions = await prisma.eligibilityQuestion.findMany({
    select: { id: true, disqualifyingIndex: true },
  });

  const eligible = questions.every((q) => {
    const answerIndex = answers[q.id];
    if (q.disqualifyingIndex === null || q.disqualifyingIndex === undefined) return true;
    return answerIndex !== q.disqualifyingIndex;
  });

  await prisma.eligibilityCheckResult.create({
    data: { learnerId: user?.id ?? null, answers, eligible },
  });

  return { eligible };
}
