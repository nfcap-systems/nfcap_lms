import { headers } from 'next/headers';

/** Derives a request's own origin from forwarded headers rather than a fixed env var — works
 * unchanged across local dev, staging, and prod without per-environment config. Trusts
 * `x-forwarded-*` first (set by Traefik in front of the deploy target); falls back to the raw
 * Host header for local dev where nothing sits in front of Next.js. Deliberately NOT
 * `new URL(request.url).origin` — behind Traefik that reflects the container's own internal bind
 * address (e.g. `0.0.0.0:3000`), not the public domain, which is what sent a signup-confirmation
 * redirect to `0.0.0.0:3000/learner` in production instead of the real domain. */
function resolveOrigin(host: string | null, forwardedProto: string | null): string {
  const h = host ?? 'localhost:3000';
  const proto =
    forwardedProto ?? (h.startsWith('localhost') || h.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${h}`;
}

/** For Server Actions/Components, via next/headers. */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  return resolveOrigin(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'));
}

/** For Route Handlers, which already have a Request and shouldn't call next/headers separately. */
export function getRequestOrigin(request: Request): string {
  const h = request.headers;
  return resolveOrigin(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'));
}
