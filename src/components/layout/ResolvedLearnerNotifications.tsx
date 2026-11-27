import { getNotificationsForUser, getUnreadNotificationCount } from '@/lib/data/notifications';
import { LearnerNotificationsBell } from './LearnerNotificationsBell';

/** Server-only data boundary around LearnerNotificationsBell, rendered under its own `<Suspense>`
 * in src/app/learner/layout.tsx (same pattern as WioaNavLink) so the per-user notifications query
 * doesn't drag the rest of the shell into the same dynamic/postponed boundary
 * (CLAUDE.md performance convention #1 — cacheComponents stays a cached shell with per-user
 * dynamic holes, never `export const dynamic = 'force-dynamic'`). */
export async function ResolvedLearnerNotifications({ userId }: { userId: string }) {
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(userId),
    getUnreadNotificationCount(userId),
  ]);
  return <LearnerNotificationsBell notifications={notifications} unreadCount={unreadCount} />;
}
