import { prisma } from '@/lib/prisma';
import type { AnnouncementAudience } from '@/generated/prisma/enums';
import type { Role } from '@/lib/nav';
import { getAllUsersWithRoles } from './users';

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

/** Active (non-deactivated) user count reachable by each audience value — "Send to N learners"
 * on compose, and the audienceSize below. One user list fetch, not one per audience. */
export async function getAudienceCounts(): Promise<Record<AnnouncementAudience, number>> {
  const users = await getAllUsersWithRoles();
  const active = users.filter((u) => u.active);

  return {
    ALL: active.length,
    LEARNERS: active.filter((u) => u.role === 'LEARNER').length,
    ADMIN: active.filter((u) => u.role === 'ADMIN').length,
    COORDINATOR: active.filter((u) => u.role === 'WIOA_COORDINATOR').length,
    PARTNER: active.filter((u) => u.role === 'PARTNER_STAFF').length,
  };
}

/** Real count behind ADM14-AnnouncementsNotifications's "N learners have no verified email on
 * file" — not fabricated, since UserRecord now carries Supabase's own email_confirmed_at. */
export async function getUnverifiedEmailLearnerCount(): Promise<number> {
  const users = await getAllUsersWithRoles();
  return users.filter((u) => u.active && u.role === 'LEARNER' && !u.emailConfirmed).length;
}

export type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  publishedAt: string;
  expiresAt: string | null;
  audienceSize: number;
  readCount: number;
};

/** Admin's own view of announcements it has published — real audience size + ReadReceipt count
 * per announcement, not scoped to one viewer's own read state like getActiveAnnouncementsForViewer
 * above. Email delivery isn't tracked (no email is sent for announcements — Phase 2's Resend
 * sending domain still isn't verified, see CLAUDE.md), so this only ever reports in-app reach. */
export async function getAnnouncementsForAdmin(limit = 20): Promise<AdminAnnouncement[]> {
  const [announcements, audienceCounts] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { publishedAt: 'desc' }, take: limit }),
    getAudienceCounts(),
  ]);
  if (announcements.length === 0) return [];

  const receiptCounts = await prisma.readReceipt.groupBy({
    by: ['subjectId'],
    where: { subjectType: 'ANNOUNCEMENT', subjectId: { in: announcements.map((a) => a.id) } },
    _count: { subjectId: true },
  });
  const readCountById = new Map(receiptCounts.map((r) => [r.subjectId, r._count.subjectId]));

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience,
    publishedAt: a.publishedAt.toISOString(),
    expiresAt: a.expiresAt?.toISOString() ?? null,
    audienceSize: audienceCounts[a.audience],
    readCount: readCountById.get(a.id) ?? 0,
  }));
}
