'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { AnnouncementAudience } from '@/generated/prisma/enums';
import { requireAdmin, requireUser } from './guard';
import { logAuditEvent } from './audit';

/** Announcements (docs/build/LAYER1_DATA_MODEL_DESIGN.md). Publishing is Admin-only; marking
 * read is any signed-in user, for their own receipt only. No UI wired to these yet
 * (ADM14-AnnouncementsNotifications is not built, Layer 3B). */

export async function publishAnnouncement(params: {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  expiresAt?: Date | null;
}): Promise<string> {
  const admin = await requireAdmin();
  const announcement = await prisma.announcement.create({
    data: {
      title: params.title,
      body: params.body,
      audience: params.audience,
      createdBy: admin.id,
      expiresAt: params.expiresAt ?? null,
    },
  });
  await logAuditEvent({
    actor: admin,
    action: 'PUBLISH_ANNOUNCEMENT',
    targetType: 'Announcement',
    targetId: announcement.id,
    metadata: { title: params.title, audience: params.audience },
  });
  revalidatePath('/admin');
  revalidatePath('/learner');
  return announcement.id;
}

export async function expireAnnouncementNow(announcementId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.announcement.update({
    where: { id: announcementId },
    data: { expiresAt: new Date() },
  });
  await logAuditEvent({
    actor: admin,
    action: 'EXPIRE_ANNOUNCEMENT',
    targetType: 'Announcement',
    targetId: announcementId,
  });
  revalidatePath('/admin');
}

export async function markAnnouncementRead(announcementId: string): Promise<void> {
  const user = await requireUser();
  await prisma.readReceipt.upsert({
    where: {
      userId_subjectType_subjectId: {
        userId: user.id,
        subjectType: 'ANNOUNCEMENT',
        subjectId: announcementId,
      },
    },
    update: {},
    create: { userId: user.id, subjectType: 'ANNOUNCEMENT', subjectId: announcementId },
  });
}
