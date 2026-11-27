import { getAuthUser } from '@/lib/supabase/server';
import { getNotificationsForUser, getUnreadNotificationCount } from '@/lib/data/notifications';
import { StaffNotificationsBell } from './StaffNotificationsBell';

/** Server-only data boundary around StaffNotificationsBell, rendered under its own `<Suspense>`
 * in each staff layout (/admin, /coordinator, /partner) — same pattern as ResolvedAccountMenu
 * (including fetching its own `getAuthUser()` rather than taking a `userId` prop: none of those
 * three layouts is an async function awaiting the user, deliberately — see their own comments),
 * so the per-user notifications query doesn't drag the rest of the static header (search bar,
 * borders) into the same dynamic/postponed boundary. */
export async function ResolvedStaffNotifications() {
  const user = await getAuthUser();
  if (!user) return <StaffNotificationsBell notifications={[]} unreadCount={0} />;
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(user.id),
    getUnreadNotificationCount(user.id),
  ]);
  return <StaffNotificationsBell notifications={notifications} unreadCount={unreadCount} />;
}
