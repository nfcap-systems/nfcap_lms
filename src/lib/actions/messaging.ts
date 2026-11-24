'use server';

import { withRlsContext } from '@/lib/db/rls';
import { requireUser } from './guard';
import { getRole } from '@/lib/supabase/server';

/** Trainee <-> Staff Messaging (docs/build/LAYER1_DATA_MODEL_DESIGN.md). RLS-scoped per decision
 * #3. `startThread` creates the thread and its participant rows inside one transaction — the
 * thread-insert policy intentionally doesn't require membership (none exists yet at that point;
 * see the design doc's "chicken-and-egg" note), but every participant row created right after it
 * must satisfy MessageThreadParticipant's own-column check (`userId = app_current_user_id()` for
 * the caller's own row; the other participant's row needs ADMIN/WIOA_COORDINATOR to insert on
 * their behalf, which the caller may not have — so for now this only supports the caller adding
 * themselves plus staff adding any participant, matching who would plausibly start a thread).
 * No UI wired to these yet (ADM26-Inbox/LRN14-LRN15 are not built, Layer 3). */
export async function startThread(
  otherUserId: string,
  firstMessageBody: string,
  subject?: string,
): Promise<string> {
  const user = await requireUser();
  const role = getRole(user) ?? '';

  return withRlsContext({ userId: user.id, role }, async (tx) => {
    const thread = await tx.messageThread.create({ data: { subject } });
    await tx.messageThreadParticipant.create({
      data: { threadId: thread.id, userId: user.id },
    });
    // Staff (ADMIN/WIOA_COORDINATOR) may add the other participant directly, per
    // MessageThreadParticipant's policy. A learner starting a thread with staff needs the staff
    // side added by that staff member's own session instead — not supported by this call alone;
    // flagged for whoever builds the Inbox UI (Layer 3), not a Layer 1 schema gap.
    if (role === 'ADMIN' || role === 'WIOA_COORDINATOR') {
      await tx.messageThreadParticipant.create({
        data: { threadId: thread.id, userId: otherUserId },
      });
    }
    await tx.message.create({
      data: { threadId: thread.id, senderId: user.id, body: firstMessageBody },
    });
    return thread.id;
  });
}

export async function sendMessage(threadId: string, body: string): Promise<void> {
  const user = await requireUser();
  const role = getRole(user) ?? '';
  await withRlsContext({ userId: user.id, role }, async (tx) => {
    await tx.message.create({ data: { threadId, senderId: user.id, body } });
    await tx.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
  });
}

export async function markThreadRead(threadId: string): Promise<void> {
  const user = await requireUser();
  const role = getRole(user) ?? '';
  await withRlsContext({ userId: user.id, role }, (tx) =>
    tx.readReceipt.upsert({
      where: {
        userId_subjectType_subjectId: {
          userId: user.id,
          subjectType: 'MESSAGE_THREAD',
          subjectId: threadId,
        },
      },
      update: { readAt: new Date() },
      create: { userId: user.id, subjectType: 'MESSAGE_THREAD', subjectId: threadId },
    }),
  );
}
