'use server';

import { prisma } from '@/lib/prisma';
import type { NotificationType } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import { requireUser } from './guard';

/** Notification Coverage Completion (docs/build/LAYER1_DATA_MODEL_DESIGN.md). `createNotification`
 * is a system/server-side call (not role-gated to a human caller) — it's meant to be invoked from
 * inside other actions (evidence reviewed, case status changed, etc.) once those are wired to emit
 * notifications, not called directly from a form. No UI wired to these yet
 * (ADM18-NotificationsPanel is not built, Layer 3B). */

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
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
