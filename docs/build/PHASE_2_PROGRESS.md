# Phase 2 Progress

Working log of Phase 2 execution against
`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` ("Phase 2 — Accounts, Access & Email",
7 features, 108h). Mirrors `docs/build/PHASE_0_PROGRESS.md`/`PHASE_1_PROGRESS.md`'s convention —
update this as status changes.

## Status as of 2026-11-17

**Phase 2 is in progress.** 5 of 7 features done and manually verified. The other 2 haven't
started.

### Done

| Feature | What shipped | Evidence |
| --- | --- | --- |
| **Transactional Email Infrastructure** | Resend account + API key wired up; `src/lib/email.ts`'s `sendEmail()` helper for app-triggered email (no-ops safely if `RESEND_API_KEY` is unset, so CI/local-without-a-key is unaffected); Supabase Auth's SMTP settings pointed at Resend so Supabase's own auth emails (password reset, email verification) route through it too. **Domain verification deliberately deferred** — no DNS access to `nfcap.org` was available, and the only other domain discussed (`dev-nfcap.corecloud365.com`) is hosting-provider-controlled, not something the project has DNS access to either. Running on Resend's shared sandbox sender (`onboarding@resend.dev`), which can only deliver to the Resend account's own signup address (`systems@nfcap.org`) until a domain is verified. | Real test email confirmed delivered to a real inbox (screenshot, landed in Inbox not spam); Supabase SMTP confirmed working via both flows below |
| **Password Reset** | Full forgot-password flow: `/forgot-password` (rate-limited request form) → Supabase email (custom template, see below) → `src/app/auth/confirm/route.ts` (verifies the link's token, establishes a session) → `/reset-password` (new password form) → `/login?reset=1`. `/login`'s dormant "Forgot your password?" link is now wired up, plus banners for "password updated" and "link expired/already used". | Verified end-to-end manually: real email received, link clicked, landed on `/reset-password`, new password set, logged in successfully with it |
| **Email Verification** | Supabase's "Confirm email" setting turned on (`Authentication → Sign In / Providers → User Signups`); "Confirm signup" email template changed the same way Reset Password's was, pointing at `/auth/confirm?...&type=signup&next=/learner`. No new app code needed — `/auth/confirm` was already generic enough to handle either link type, and `src/lib/actions/auth.ts`'s `signup()` already had both branches (confirmed-immediately vs. needs-confirmation) from before this phase. Clicking the link signs the learner straight into `/learner` — verifying the link also establishes a session, so no separate manual login step is needed. | Verified end-to-end manually: signed up, rejected an early login attempt with "email not confirmed," received the email, clicked it, landed on `/learner` already signed in |
| **Session & Login Hardening** | Auth cookies now get `httpOnly: true` always and `secure: true` in production (`src/lib/supabase/middleware.ts` + `src/lib/supabase/server.ts`, via a shared `AUTH_COOKIE_OPTIONS` in the new `src/lib/supabase/session.ts`); `sameSite: 'lax'` kept. Cookie `Max-Age` capped at 30 days, down from `@supabase/ssr`'s 400-day default. That cap had to be applied by overriding `options.maxAge` ourselves inside the `setAll` callback we hand the library, not via `createServerClient`'s `cookieOptions` — the installed `@supabase/ssr` 0.12.7 silently discards any `maxAge` passed that way (`cookies.js`'s `applyServerStorage` always re-applies its own 400-day default *after* spreading in caller options; `httpOnly`/`sameSite`/`secure` aren't affected by that and do work via `cookieOptions`). Removed the dead "Remember me" checkbox from `LoginForm.tsx` — `login()` never read it, and the client's scope doc doesn't call for it. Wiring it up for real was considered and dropped: `src/proxy.ts`'s middleware re-issues the session cookie on every request, so a per-login choice can't stick without a separate preference cookie for middleware to read back on each request — judged not worth the extra moving part for a 12h item. Repeated-login-attempt protection needed no new work: `enforceRateLimit` (Phase 1) already caps `/login` at 10 attempts/15min per email. | Logged in as the seeded demo admin (`admin@demo.nfcap.test`) and inspected the `sb-*` auth cookie in browser DevTools: `HttpOnly` checked, `SameSite=Lax`, ~30-day expiry (not the library's ~400-day default), `Secure` correctly unchecked on local `http://localhost`. **Not yet checked:** the Supabase dashboard's Auth → Sessions/JWT settings (access token expiry, refresh token lifetime/reuse interval) — those govern actual server-side session validity independent of the cookie, and haven't been reviewed this session. |
| **Account Settings** | One shared screen for all four roles — new `/learner/account`, `/admin/account`, `/partner/account`, `/coordinator/account` pages, all rendering the same `AccountSettingsForm` (`src/components/account/AccountSettingsForm.tsx`), linked from each role's account-menu dropdown (`Sidebar.tsx`'s `ProfileMenu` for Admin/Partner/Coordinator, `LearnerHeader.tsx` for Learner). New actions in `src/lib/actions/account.ts`: `updateName` (no reauth — low risk), `updateEmail` and `updateAccountPassword` (both require re-entering the current password first — Supabase's `updateUser()` doesn't check session freshness on its own, so this is the only thing standing between a hijacked session and a silent takeover; both re-authenticate via `signInWithPassword` before applying the change, and are rate-limited the same way `/login` is, keyed by user id), and `updateContactInfo` (Learner only — street/city/state/zip/phone/DOB/preferred-language on `LearnerProfile`, through `withRlsContext` per Phase 1's rule; deliberately excludes the WIOA intake fields `updateWioaProfile` in `src/lib/actions/wioa.ts` owns, since that action unconditionally sets `fundingSource: 'WIOA_PENDING'` as a side effect this general settings page must not trigger). `/admin/settings` (the existing nav placeholder) was left alone — reserved for future platform-wide settings per `docs/product/PRODUCT_CONTEXT.md`, not personal account settings. | Verified manually as the seeded demo admin on `/admin/account`: name change succeeded with sidebar update; password change correctly **rejected** a wrong current password, then succeeded with the right one and stayed on the page (no bounce to `/login`). **Not verified:** email-change's actual delivery — blocked by the same Resend sandbox limit as the rest of this phase (only `systems@nfcap.org` is deliverable, and it's already in use by another test account, so there's currently no address to test real delivery against) and by a "Change Email Address" Supabase template that was never set up (only Reset Password and Confirm Signup were, earlier this phase); the request does reach Supabase correctly (confirmed via its own error message, not a generic/malformed-request failure). Learner's Contact Info section (the fourth, Learner-only card) hasn't been clicked through yet — only the Admin account's Name/Email/Password sections were. |

### Required manual configuration (not in git — Supabase dashboard state)

Two settings only exist in the Supabase dashboard, not as code, so a fresh Supabase project (or
anyone resetting this one) needs to redo them:

1. **Authentication → Emails → SMTP Settings** — custom SMTP enabled, pointed at Resend
   (`smtp.resend.com`, port 465, username `resend`, password = the Resend API key). Supabase
   won't let you edit email templates at all until this is configured.
2. **Authentication → Emails → Templates → Reset password** — the link's `href` was changed from
   the default `{{ .ConfirmationURL }}` to:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset password</a>
   ```
   This is required because the default link only works in a browser (hash-fragment token); this
   app's `/auth/confirm` route needs a server-readable `token_hash` instead.
3. **Authentication → URL Configuration** — Site URL set to `http://localhost:3000` (dev); Redirect
   URLs includes `http://localhost:3000/auth/confirm`. **Both need updating for staging/production
   domains before this works anywhere but local dev** — not yet done, since no non-local URL exists
   to point at yet.

### Known limitation to revisit before go-live

No sending domain is verified in Resend, so real delivery is restricted to one address
(`systems@nfcap.org`). This has zero effect on local development/testing, but it must be resolved
— verifying a subdomain the project has DNS access to — before any real trainee or staff member
can receive a real password-reset or verification email. Revisit once DNS access to some domain
(not necessarily `nfcap.org`'s apex — a subdomain is enough, and deliberately isolates sending
reputation from NFCAP's existing email) is available.

### Bugs found and fixed while testing Email Verification

Both had zero prior coverage — this was the first time `signup()`'s "confirmation required" branch
and `withRlsContext` were exercised together against real email delivery:

1. **Prisma `P2028` ("Unable to start a transaction in the given time") inside `withRlsContext`**,
   hit during the `LearnerProfile` creation step of signup. Root cause: `src/lib/db/rls.ts`'s
   `$transaction()` call had no explicit `maxWait`/`timeout`, so it used Prisma's defaults
   (2s/5s) — too tight given this environment's own baseline connection latency to Supabase
   (~1.7-2s just to open a connection, independently measured earlier this session). Fixed by
   passing `{ maxWait: 10_000, timeout: 20_000 }`, matching the margin already used for the
   underlying `pg.Pool`'s `connectionTimeoutMillis`. Confirmed it wasn't a real leak first
   (`pg_stat_activity` showed no abnormal connection count) before concluding it was a timeout
   setting, not a resource problem.
2. Editing `src/lib/db/rls.ts` while the dev server was running left Turbopack's dev compiler in a
   stale state (`Next.js (stale)` badge, "unexpected Turbopack error") — not a real bug, just a
   dev-server quirk after hot-reloading a module with side-effecting top-level state (the
   connection pool). Fixed by restarting the dev server.

### Not started

- Role Management Screen (20h)
- User Deactivation & Offboarding (16h)
