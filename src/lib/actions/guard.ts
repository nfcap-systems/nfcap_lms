import { getAuthUser, getRole } from '@/lib/supabase/server';

/** Throws unless the current session is an ADMIN. Every admin-only server action calls this
 * first — proxy.ts keeps non-admins out of /admin/* pages, but a server action can be invoked
 * directly, so it needs its own authorization check (see Next.js Data Security guidance). */
export async function requireAdmin() {
  const user = await getAuthUser();
  if (getRole(user) !== 'ADMIN') {
    throw new Error('Admin access required.');
  }
  return user!;
}

/** Throws unless the current session is signed in (any role). Returns the user id. */
export async function requireUser() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('You must be signed in.');
  }
  return user;
}

/** Throws unless the current session is PARTNER_STAFF, same shape as requireAdmin. */
export async function requirePartnerStaff() {
  const user = await getAuthUser();
  if (getRole(user) !== 'PARTNER_STAFF') {
    throw new Error('Partner Staff access required.');
  }
  return user!;
}

/** Throws unless the current session is WIOA_COORDINATOR, same shape as requireAdmin. */
export async function requireCoordinator() {
  const user = await getAuthUser();
  if (getRole(user) !== 'WIOA_COORDINATOR') {
    throw new Error('WIOA Coordinator access required.');
  }
  return user!;
}
