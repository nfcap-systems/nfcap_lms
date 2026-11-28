import { prisma } from '@/lib/prisma';
import { emitNotification } from '@/lib/notifications/emit';
import { logAuditEvent } from './audit';
import { determineWioaFollowUpReason } from '@/lib/wioa/follow-up';
import { getAllUsersWithRoles } from '@/lib/data/users';
import { getLearnerById } from '@/lib/data/learners';
import { effectiveUploadLimit } from '@/lib/wioa/constants';

/** How often this sweep is expected to run (the GitHub Action's schedule, currently disabled —
 * see `.github/workflows/wioa-follow-up-notifications.yml`). The dedupe window below is kept
 * slightly under 24h so a run that slips a little doesn't miss a day, without being so long that
 * a genuinely new day's reminder gets swallowed. */
const DEDUPE_WINDOW_MS = 1000 * 60 * 60 * 20;

export type WioaFollowUpSweepResult = {
  casesEvaluated: number;
  notificationsEmitted: number;
  recipientsNotified: number;
};

/** NOTIF-3 — turns the `followUpQueue` conditions (five originally, plus the appointment
 * reminder and CAP-3's upload-cap trigger — seven total now)
 * from `getWioaReportingSummary` (dashboard-only) into real notifications. Deliberately NOT called
 * from inside `getWioaReportingSummary` itself: that function runs on every Reports-page render,
 * and emitting a side effect from a read is how you get a fresh duplicate notification on every
 * page view. This is a separate, system-triggered sweep instead — same shape as
 * `runDataRetentionSweep` (`src/lib/actions/retention.ts`): plain `prisma` (no RLS — there's no
 * signed-in user triggering this), and intended to run on a schedule via
 * `/api/cron/wioa-follow-up/route.ts`, not on demand.
 *
 * Idempotency: a sweep run that finds the same case still in the same stalled state as the last
 * run must not re-notify every recipient every time it runs. Deduped by checking for a recent
 * notification to the same recipient, of this type, with the same link and title (title encodes
 * the reason) within `DEDUPE_WINDOW_MS` — no separate dedupe table, matching how little
 * infrastructure the rest of this feature needed. */
export async function runWioaFollowUpNotificationSweep(): Promise<WioaFollowUpSweepResult> {
  const cases = await prisma.wioaCase.findMany({
    where: { closedAt: null },
    select: {
      id: true,
      learnerId: true,
      status: true,
      updatedAt: true,
      assignedPartnerStaffId: true,
      documents: {
        select: {
          status: true,
          uploadedAt: true,
          uploadLimitOverride: true,
          _count: { select: { versions: true } },
        },
      },
      courseCases: { select: { id: true } },
      appointments: {
        where: { completedAt: null },
        select: { scheduledAt: true },
        orderBy: { scheduledAt: 'asc' },
        take: 1,
      },
    },
  });

  const now = new Date();
  let notificationsEmitted = 0;
  const recipientsNotified = new Set<string>();

  const coordinatorIds = (await getAllUsersWithRoles())
    .filter((u) => u.role === 'WIOA_COORDINATOR' && u.active)
    .map((u) => u.id);

  for (const c of cases) {
    const trigger = determineWioaFollowUpReason({
      status: c.status,
      updatedAt: c.updatedAt,
      hasRejectedDocument: c.documents.some((d) => d.status === 'REJECTED'),
      hasCappedDocument: c.documents.some(
        (d) =>
          d._count.versions + (d.uploadedAt ? 1 : 0) >= effectiveUploadLimit(d.uploadLimitOverride),
      ),
      courseCaseCount: c.courseCases.length,
      nextAppointmentAt: c.appointments[0]?.scheduledAt ?? null,
      now,
    });
    if (!trigger) continue;

    const learner = await getLearnerById(c.learnerId);
    const title = `WIOA case needs follow-up`;
    const body = `${learner?.name ?? 'A learner'}: ${trigger.reason}`;

    // Coordinators and the assigned partner staff see the case through different route prefixes
    // (`/coordinator/[caseId]` vs `/partner/[caseId]`) — same underlying case, different link per
    // recipient's own shell, same as every other cross-role WIOA link in this app.
    const recipients: { id: string; link: string }[] = coordinatorIds.map((id) => ({
      id,
      link: `/coordinator/${c.id}`,
    }));
    if (c.assignedPartnerStaffId) {
      recipients.push({ id: c.assignedPartnerStaffId, link: `/partner/${c.id}` });
    }

    for (const { id: recipientId, link } of recipients) {
      const recentDuplicate = await prisma.notification.findFirst({
        where: {
          userId: recipientId,
          type: 'WIOA_FOLLOW_UP_NEEDED',
          link,
          title,
          body,
          createdAt: { gte: new Date(now.getTime() - DEDUPE_WINDOW_MS) },
        },
        select: { id: true },
      });
      if (recentDuplicate) continue;

      await emitNotification({
        userId: recipientId,
        type: 'WIOA_FOLLOW_UP_NEEDED',
        title,
        body,
        link,
        metadata: { caseId: c.id, reasonCode: trigger.code },
      });
      notificationsEmitted += 1;
      recipientsNotified.add(recipientId);
    }
  }

  await logAuditEvent({
    actor: 'system',
    action: 'WIOA_FOLLOW_UP_NOTIFICATION_SWEEP',
    targetType: 'WioaCase',
    metadata: {
      casesEvaluated: cases.length,
      notificationsEmitted,
      recipientsNotified: recipientsNotified.size,
    },
  });

  return {
    casesEvaluated: cases.length,
    notificationsEmitted,
    recipientsNotified: recipientsNotified.size,
  };
}
