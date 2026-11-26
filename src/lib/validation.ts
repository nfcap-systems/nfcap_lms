/** Client-side validation helpers for the Astryx-based auth forms (Login, Signup, Signup/WIOA,
 * Forgot Password). @astryxdesign/core's TextInput only exposes `isRequired`, which sets
 * `aria-required` for accessibility — it never sets the native HTML `required` attribute, so none
 * of these forms get real browser-level validation blocking. This fills that gap at the app
 * layer, matching the pattern ResetPasswordAstryx.tsx already used for password-mismatch. */

/** Deliberately permissive (not RFC 5322) — this only needs to catch obviously-malformed input
 * before a round trip to Supabase, which does its own authoritative validation server-side. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
