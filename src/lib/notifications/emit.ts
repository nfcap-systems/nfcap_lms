import { prisma } from '@/lib/prisma';
import type { NotificationType } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';

/** Internal write path for Notification (Notification Coverage Completion,
 * docs/build/LAYER1_DATA_MODEL_DESIGN.md). Deliberately has no caller-role check and lives in a
 * plain module with no `'use server'` directive — the acting user that triggers a notification is
 * frequently not its recipient and often isn't privileged at all (e.g. a learner hitting the WIOA
 * upload cap needs to notify their coordinator). `src/lib/actions/notifications.ts`'s
 * `createNotification` is the only externally-reachable door onto this table (every export of a
 * `'use server'` file becomes a public server action, which is exactly the un-gated door this
 * split avoids); it keeps its ADMIN/WIOA_COORDINATOR role check and delegates here, so there is
 * one write path, not two. */
export async function emitNotification(params: {
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
