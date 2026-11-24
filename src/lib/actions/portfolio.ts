'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from './guard';
import { logAuditEvent } from './audit';

/** Shareable Verified Portfolio (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — one active share link
 * per learner, matching LRN07's "Share your portfolio" panel. No UI wired to these yet (the
 * public `/portfolio/[token]`-style route LRN07 implies doesn't exist, Layer 4). */
export async function generatePortfolioShareToken(): Promise<string> {
  const user = await requireUser();
  const existing = await prisma.learnerProfile.findUnique({
    where: { learnerId: user.id },
    select: { portfolioShareToken: true },
  });
  if (existing?.portfolioShareToken) return existing.portfolioShareToken;

  const token = randomBytes(12).toString('base64url');
  await prisma.learnerProfile.upsert({
    where: { learnerId: user.id },
    update: { portfolioShareToken: token, portfolioSharedAt: new Date() },
    create: { learnerId: user.id, portfolioShareToken: token, portfolioSharedAt: new Date() },
  });
  await logAuditEvent({
    actor: user,
    action: 'SHARE_PORTFOLIO',
    targetType: 'LearnerProfile',
    targetId: user.id,
  });
  revalidatePath('/learner/portfolio');
  return token;
}

export async function revokePortfolioShareToken(): Promise<void> {
  const user = await requireUser();
  await prisma.learnerProfile.update({
    where: { learnerId: user.id },
    data: { portfolioShareToken: null, portfolioSharedAt: null },
  });
  await logAuditEvent({
    actor: user,
    action: 'REVOKE_PORTFOLIO_SHARE',
    targetType: 'LearnerProfile',
    targetId: user.id,
  });
  revalidatePath('/learner/portfolio');
}
