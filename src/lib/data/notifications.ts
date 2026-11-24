import { prisma } from '@/lib/prisma';
import type { NotificationType } from '@/generated/prisma/enums';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

/** Notification Coverage Completion (docs/build/LAYER1_DATA_MODEL_DESIGN.md). One row per
 * recipient already (not broadcast), so this is a plain per-user query — no read-receipt join
 * needed, unlike Announcement/MessageThread. */
export async function getNotificationsForUser(userId: string, limit = 50): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
