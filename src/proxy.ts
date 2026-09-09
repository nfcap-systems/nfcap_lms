import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { ROLE_HOME, isRole } from '@/lib/roles';

const ROLE_PREFIXES = Object.entries(ROLE_HOME);

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // /api/* is never a browser page navigation — an unauthenticated hit gets a 401 JSON body,
  // not a login-page redirect.
  if (pathname.startsWith('/api') && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Server actions POST with a `next-action` header — redirecting one breaks the client's
  // fetch-based action call, so let it through; role guards still apply on the resulting
  // page render.
  if (request.headers.has('next-action')) {
    return supabaseResponse;
  }

  const roleValue = user ? user.app_metadata?.role : undefined;
  const role = isRole(roleValue) ? roleValue : undefined;
  const home = role ? ROLE_HOME[role] : undefined;

  const isProtectedPath = ROLE_PREFIXES.some(([, prefix]) => pathname.startsWith(prefix));

  if (!user && (isProtectedPath || pathname === '/')) {
    const destination = pathname === '/' ? undefined : pathname + request.nextUrl.search;
    const redirectUrl = new URL('/login', request.url);
    if (destination) redirectUrl.searchParams.set('next', destination);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    // Signed in and hitting /, /login, or /signup → their own dashboard.
    if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
      if (!home) return supabaseResponse; // no role stamped yet — let the page handle it
      return NextResponse.redirect(new URL(home, request.url));
    }

    // Wrong-role dashboard access → redirect to their own. Each role is confined to exactly
    // one prefix — no cross-role preview in this prototype.
    for (const [ownerRole, prefix] of ROLE_PREFIXES) {
      if (pathname.startsWith(prefix) && role !== ownerRole) {
        return NextResponse.redirect(new URL(home ?? '/login', request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
