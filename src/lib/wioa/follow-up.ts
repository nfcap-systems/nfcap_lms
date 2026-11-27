import type { WioaEligibilityStatus } from '@/generated/prisma/enums';

/** Stable, machine-readable companion to each `WioaFollowUpItem.reason` string — the sweep
 * (`src/lib/actions/wioa-notifications.ts`) needs a code to dedupe on, since the human-readable
 * `reason` text alone is fine for display but not meant to be a dedupe key. */
export type WioaFollowUpReasonCode =
  | 'DOCUMENT_REJECTED'
  | 'NO_RESPONSE'
  | 'DOCUMENTS_PENDING'
  | 'ELIGIBLE_NO_FUNDING'
  | 'APPOINTMENT_UPCOMING';

export type WioaFollowUpTrigger = { code: WioaFollowUpReasonCode; reason: string };

const DAY_MS = 1000 * 60 * 60 * 24;

/** Whole weekdays elapsed between two instants, counting only days strictly after `from` and up
 * to and including `to`'s calendar day. Replaces a calendar-day count (NOTIF-3 / spec-alignment
 * gap #6): a Friday-evening outreach with no reply must not read as "3+ days stalled" by Monday
 * morning — only Mon/Tue/Wed (3 weekdays) should trip it. */
function businessDaysBetween(from: Date, to: Date): number {
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  let days = 0;
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

/** An appointment counts as "upcoming" inside this window — tight enough to be an actual
 * reminder, not a standing to-do. */
const APPOINTMENT_REMINDER_WINDOW_MS = 1000 * 60 * 60 * 48;

/** Single source of truth for "does this master case need staff follow-up right now, and why" —
 * shared by `getWioaReportingSummary` (dashboard display, `src/lib/data/wioa.ts`) and
 * `runWioaFollowUpNotificationSweep` (the notification-emitting cron job,
 * `src/lib/actions/wioa-notifications.ts`), so the business-day fix and the trigger set can't
 * drift between the two callers. Pure — no DB access — so it's trivial to unit test. Already-closed
 * cases are the caller's job to filter out (both callers already only pass open cases), not this
 * function's, since "closed" isn't itself a trigger condition. */
export function determineWioaFollowUpReason(input: {
  status: WioaEligibilityStatus;
  updatedAt: Date;
  hasRejectedDocument: boolean;
  courseCaseCount: number;
  nextAppointmentAt: Date | null;
  now?: Date;
}): WioaFollowUpTrigger | null {
  const now = input.now ?? new Date();

  if (input.hasRejectedDocument) {
    return { code: 'DOCUMENT_REJECTED', reason: 'Document rejected — needs resubmission' };
  }
  if (input.status === 'AWAITING_RESPONSE' && businessDaysBetween(input.updatedAt, now) >= 3) {
    return { code: 'NO_RESPONSE', reason: 'No response 3+ business days after outreach' };
  }
  if (
    input.status === 'DOCUMENTS_PENDING' &&
    (now.getTime() - input.updatedAt.getTime()) / DAY_MS >= 5
  ) {
    return { code: 'DOCUMENTS_PENDING', reason: 'Documents pending 5+ days' };
  }
  if (input.status === 'WIOA_ELIGIBLE' && input.courseCaseCount === 0) {
    return {
      code: 'ELIGIBLE_NO_FUNDING',
      reason: 'Eligible — no ETPL funding request started yet',
    };
  }
  if (input.nextAppointmentAt) {
    const msUntil = input.nextAppointmentAt.getTime() - now.getTime();
    if (msUntil >= 0 && msUntil <= APPOINTMENT_REMINDER_WINDOW_MS) {
      return {
        code: 'APPOINTMENT_UPCOMING',
        reason: `Upcoming appointment on ${input.nextAppointmentAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`,
      };
    }
  }
  return null;
}
