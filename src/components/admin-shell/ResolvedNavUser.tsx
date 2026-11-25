import { getAuthUser } from '@/lib/supabase/server';
import { NavUser } from './NavUser';

/** Server-only data boundary around NavUser (the sidebar footer's name/email/account-menu). Kept
 * separate from AppSidebar itself and rendered under its own `<Suspense>` so the per-user
 * `getAuthUser()` fetch doesn't drag the rest of the sidebar (nav links, Quick Create, borders —
 * all static, identical for every signed-in user) into the same dynamic/postponed boundary. See
 * the matching note on AppSidebar's `userSlot` prop. */
export async function ResolvedNavUser({ accountHref }: { accountHref: string }) {
  const user = await getAuthUser();
  const userName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  const userEmail = user?.email ?? '';

  return <NavUser name={userName} email={userEmail} accountHref={accountHref} />;
}
