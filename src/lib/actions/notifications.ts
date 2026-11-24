'use server';

import { prisma } from '@/lib/prisma';
import type { NotificationType } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import { requireUser } from './guard';
import { getRole } from '@/lib/supabase/server';

/** Notification Coverage Completion (docs/build/LAYER1_DATA_MODEL_DESIGN.md). `createNotification`
 * is meant to be invoked from inside other actions (evidence reviewed, case status changed, etc.)
 * once those are wired to emit notifications, not called directly from a form. No UI wired to
 * these yet (ADM18-NotificationsPanel is not built, Layer 3B).
 *
 * Still a `'use server'` export, so it's directly callable by anyone with a session regardless of
 * what the UI currently wires up (src/lib/actions/guard.ts's requireAdmin comment: "a server
 * action can be invoked directly"/next-action POSTs skip proxy.ts entirely) — gated to
 * ADMIN/WIOA_COORDINATOR, its only legitimate current and planned callers, instead of being
 * reachable by any signed-in user to write arbitrary content into anyone else's notification feed. */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const caller = await requireUser();
  const role = getRole(caller);
  if (role !== 'ADMIN' && role !== 'WIOA_COORDINATOR') {
    throw new Error('Not authorized to create notifications.');
  }
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await requireUser();
  // Scoped to the caller's own row — `updateMany` rather than `update` so a notification id
  // belonging to someone else silently matches zero rows instead of throwing, same shape as an
  // RLS-style "not found vs not yours" distinction without needing Postgres RLS for this table
  // (design doc decision #3 — Notification stays app-level-authorized).
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}
