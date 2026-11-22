/** Session & Login Hardening (docs/build/PHASE_2_PROGRESS.md). `@supabase/ssr` 0.12.7 ignores any
 * `maxAge` passed via `createServerClient`'s `cookieOptions` — both its browser and server cookie-
 * write paths build the final `Set-Cookie` options as `{ ...DEFAULT_COOKIE_OPTIONS, ...cookieOptions,
 * maxAge: DEFAULT_COOKIE_OPTIONS.maxAge }` (node_modules/@supabase/ssr/dist/main/cookies.js:230,470),
 * re-applying its own 400-day default *after* spreading in whatever we pass. `httpOnly`/`sameSite`/
 * `secure` aren't touched that way and work normally via `cookieOptions`; `maxAge` has to be
 * overridden ourselves in the `setAll` callback we provide to the library instead. */
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, not the library's 400-day default

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

/** Applies `SESSION_COOKIE_MAX_AGE` to a cookie the library is setting, without disturbing a
 * removal (`maxAge: 0`, used to clear a cookie on sign-out/rotation) into a 30-day one. */
export function withSessionMaxAge(options: Record<string, unknown>) {
  return { ...options, maxAge: options.maxAge === 0 ? 0 : SESSION_COOKIE_MAX_AGE };
}
