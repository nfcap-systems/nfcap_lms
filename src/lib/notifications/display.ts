import type { NotificationType } from '@/generated/prisma/enums';
import type { IconName } from '@/components/icons';

/** Shared by both notification panels (NOTIF-1) — a plain lookup, not UI, so it doesn't collapse
 * the two panels back into one shared component the way `NotificationsMenu` was. */
export function notificationTypeIcon(type: NotificationType): IconName {
  switch (type) {
    case 'EVIDENCE_REVIEWED':
      return 'check';
    case 'CASE_STATUS_CHANGED':
      return 'clipboard';
    case 'MESSAGE_RECEIVED':
      return 'message-circle';
    case 'ANNOUNCEMENT_PUBLISHED':
      return 'alert-circle';
    case 'DEADLINE_UPCOMING':
      return 'clock';
    case 'COHORT_UPDATE':
      return 'users';
  }
}
