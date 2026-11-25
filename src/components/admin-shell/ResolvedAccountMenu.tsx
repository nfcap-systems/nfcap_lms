import { getAuthUser } from '@/lib/supabase/server';
import { HeaderAccountMenu } from './HeaderAccountMenu';

/** Server-only data boundary around HeaderAccountMenu, rendered under its own `<Suspense>` in
 * AdminHeader's caller so the per-user `getAuthUser()` fetch doesn't drag the rest of the header
 * (search bar, notifications, borders — all static) into the same dynamic/postponed boundary. See
 * the matching note on ResolvedNavUser. */
export async function ResolvedAccountMenu({ accountHref }: { accountHref: string }) {
  const user = await getAuthUser();
  const userName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  const userEmail = user?.email ?? '';

  return <HeaderAccountMenu name={userName} email={userEmail} accountHref={accountHref} />;
}
