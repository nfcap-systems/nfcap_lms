import { prisma } from '@/lib/prisma';
import type { AnnouncementAudience } from '@/generated/prisma/enums';
import type { Role } from '@/lib/nav';

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  publishedAt: string;
  expiresAt: string | null;
  read: boolean;
};

const AUDIENCE_FOR_ROLE: Record<Role, AnnouncementAudience[]> = {
  learner: ['ALL', 'LEARNERS'],
  admin: ['ALL', 'ADMIN'],
  coordinator: ['ALL', 'COORDINATOR'],
  partner: ['ALL', 'PARTNER'],
};

/** Announcements (docs/build/LAYER1_DATA_MODEL_DESIGN.md) — active (not expired) announcements
 * for one viewer's role, with that viewer's own read state joined from the shared ReadReceipt
 * table (decision #1 — one shared pattern for Announcement/MessageThread, not three). */
export async function getActiveAnnouncementsForViewer(
  viewerId: string,
  role: Role,
): Promise<Announcement[]> {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      audience: { in: AUDIENCE_FOR_ROLE[role] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { publishedAt: 'desc' },
  });
  if (announcements.length === 0) return [];

  const receipts = await prisma.readReceipt.findMany({
    where: {
      userId: viewerId,
      subjectType: 'ANNOUNCEMENT',
      subjectId: { in: announcements.map((a) => a.id) },
    },
    select: { subjectId: true },
  });
  const readIds = new Set(receipts.map((r) => r.subjectId));

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience,
    publishedAt: a.publishedAt.toISOString(),
    expiresAt: a.expiresAt?.toISOString() ?? null,
    read: readIds.has(a.id),
  }));
}
