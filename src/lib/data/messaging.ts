import { withRlsContext } from '@/lib/db/rls';

export type MessageThreadSummary = {
  id: string;
  subject: string | null;
  updatedAt: string;
  unread: boolean;
};

export type MessageRow = {
  id: string;
  senderId: string;
  body: string;
  sentAt: string;
};

/** Trainee <-> Staff Messaging (docs/build/LAYER1_DATA_MODEL_DESIGN.md). RLS-scoped per decision
 * #3 — `withRlsContext` sets `app.user_id`/`app.user_role` so `MessageThread`'s own SELECT policy
 * (`app_can_access_thread`) decides which rows come back; this function trusts the database, not
 * an application-level filter. Only threads the caller is a participant of (via
 * `MessageThreadParticipant`, checked inside the policy) are returned — never queries
 * `MessageThreadParticipant` directly here, since that table's own policy only exposes the
 * caller's own row (design doc decision #3's accepted trade-off).
 *
 * No UI wired to these yet (ADM26-Inbox/LRN14-LRN15 are not built, Layer 3). */
export async function getThreadsForUser(
  userId: string,
  role: string,
): Promise<MessageThreadSummary[]> {
  return withRlsContext({ userId, role }, async (tx) => {
    const threads = await tx.messageThread.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, subject: true, updatedAt: true },
    });
    if (threads.length === 0) return [];

    const receipts = await tx.readReceipt.findMany({
      where: {
        userId,
        subjectType: 'MESSAGE_THREAD',
        subjectId: { in: threads.map((t) => t.id) },
      },
      select: { subjectId: true, readAt: true },
    });
    const readAtByThread = new Map(receipts.map((r) => [r.subjectId, r.readAt]));

    return threads.map((t) => {
      const readAt = readAtByThread.get(t.id);
      return {
        id: t.id,
        subject: t.subject,
        updatedAt: t.updatedAt.toISOString(),
        unread: !readAt || readAt < t.updatedAt,
      };
    });
  });
}

export async function getMessagesForThread(
  userId: string,
  role: string,
  threadId: string,
): Promise<MessageRow[]> {
  return withRlsContext({ userId, role }, async (tx) => {
    const messages = await tx.message.findMany({
      where: { threadId },
      orderBy: { sentAt: 'asc' },
      select: { id: true, senderId: true, body: true, sentAt: true },
    });
    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      sentAt: m.sentAt.toISOString(),
    }));
  });
}
