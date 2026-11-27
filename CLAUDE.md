# NFCAP LMS — Working Notes

Next.js 16 · React 19 · Prisma 7 · Supabase (Postgres + Auth + Storage) · Tailwind 4 · TypeScript.

Training and certification platform for NFCAP's flooring apprenticeship, including a WIOA funding
module. Four roles: Learner, Admin, WIOA Coordinator, Partner Staff.

## Where truth lives

Read `docs/HANDOFF.md` first — it is the onboarding entry point. Then, by question:

| Question | Doc |
| --- | --- |
| What is in scope, what it costs, what order it ships | `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` ← **the build plan** |
| Per-feature detail behind that plan | `docs/client/NFCAP_LMS_Feature_Detail_Client.md` |
| Product scope, roles, feature decisions | `docs/product/PRODUCT_CONTEXT.md` |
| Performance findings + how they map onto the build plan | `docs/build/PERFORMANCE_PLAN.md` |
| Phase 0 execution status — what's done, what's open, why | `docs/build/PHASE_0_PROGRESS.md` |
| Phase 1 execution status — what's done, what's open, why | `docs/build/PHASE_1_PROGRESS.md` |
| Phase 2 execution status — what's done, what's open, why | `docs/build/PHASE_2_PROGRESS.md` |
| Phase 3 execution status — what's done, what's open, why | `docs/build/PHASE_3_PROGRESS.md` |
| **Active:** Phase 3 build + the design-system migration it depends on, started without Plane connected — branch/PR naming, progress log, deliberate deviations from `DEV-APPROACH.md`, and the exact backfill-into-Plane steps | `docs/plans/phase-3-and-design-migration-kickoff.md` |
| **Active:** Phase 5 kickoff — corrected worklist after the 2026-11-25 code audit, open product questions, process decisions | `docs/plans/phase-5-funding-productisation-kickoff.md` |
| **Active, supersedes the Phase 5 worklist for now:** WIOA module spec-alignment gaps found 2026-11-25 against the formal developer spec — the per-course-vs-per-student case-structure question and six smaller gaps, with the resume plan | `docs/plans/wioa-spec-alignment-kickoff.md` |
| What the 2026-11-25 code-level audit actually found per feature in Phases 5–8 (and re-checked Phase 0/3/4 open items), with file:line evidence | `docs/build/CODE_VERIFICATION_AUDIT_2026-11-25.md` |
| WIOA module shape and closed decisions | `docs/wioa/WIOA_INTEGRATION_PLAN.md`, `docs/build/WIOA_BUILD_WORKFLOW.md` |
| The formal WIOA developer spec this module should align to (not previously cross-checked — see the spec-alignment row above) | `docs/wioa/WIOA_Eligibility_Matching_App_Developer_Specification.pdf` |
| Design system / tokens | `docs/design/NFCAP_DESIGN_SYSTEM.md` |

Do not reopen decisions already closed in `PRODUCT_CONTEXT.md` or the client scope doc.

## Current state (as of 2026-11-23)

- **The client scope plan is approved.** 65 features, 9 phases, ~1,431h. **Phase 0 is in progress,
  not complete** — 3 of its 6 scoped features are done (Automated Test Suite, Automated Checks/CI,
  Error Handling & Monitoring); see `docs/build/PHASE_0_PROGRESS.md` for the full per-feature
  breakdown, including the 3 that are still open or uncredited (Staging Environment & Migration
  Strategy is partial — migrations aren't automated in the deploy step; WIOA Funding Module
  Sign-Off has real verification work behind it but was never formally credited against this item;
  Backup, Restore & Recovery Drill is deferred to pre-launch).
- **Phase 1 (Security & Data Protection) is complete** as of 2026-11-17 — PR #2 merged to `stage`.
  All 9 scoped features have real, shipped work; see `docs/build/PHASE_1_PROGRESS.md` for the
  full breakdown. Row-Level Access Rules (the item still open as of 2026-11-05) is now rewired
  end-to-end: `src/lib/actions/wioa.ts` and `src/lib/data/wioa.ts` go through `src/lib/db/rls.ts`'s
  `withRlsContext` instead of the RLS-bypassing `prisma` client, verified by CI's full suite
  (Vitest + Playwright/E2E) against real Postgres and a live Supabase project. That work surfaced
  and fixed two previously-uncaught bugs with zero prior test coverage: a test-fixture/seed-data
  lifecycle bug, and **infinite recursion in the RLS helper functions themselves**
  (`app_can_access_case`/`app_can_access_learner`, fixed in migration
  `20261117050000_fix_rls_helper_recursion`, applied to the live database and functionally
  verified 2026-11-17). CI's E2E suite briefly couldn't run because the Supabase staging project
  had gone unreachable (consistent with a free-tier auto-pause) — resumed from the dashboard, then
  CI re-ran fully green.
- **Phase 2 (Accounts, Access & Email) is complete** as of 2026-11-18 — all 7 scoped features done
  and manually verified: Transactional Email Infrastructure (Resend, wired into both
  `src/lib/email.ts` for app-triggered email and Supabase Auth's SMTP for its own auth emails),
  Password Reset (`/forgot-password` → email → `src/app/auth/confirm/route.ts` → `/reset-password`),
  Email Verification (same `/auth/confirm` route, `type=signup`; confirming logs the learner
  straight into `/learner`), Session & Login Hardening (`httpOnly`/`secure`/`sameSite` cookies,
  30-day cap replacing `@supabase/ssr`'s 400-day default — see `src/lib/supabase/session.ts`),
  Account Settings (`/{role}/account` for all four roles — name/email/password, reauth-gated, plus
  Learner contact info), Role Management Screen (`/admin/roles` — replaces
  `scripts/promote-role.ts` with a real UI), and User Deactivation & Offboarding (same
  `/admin/roles` screen, Supabase's `ban_duration` admin API — deactivate/reactivate, nothing
  deleted). Testing this phase surfaced a real bug: `src/lib/db/rls.ts`'s `withRlsContext` had no
  explicit transaction timeout, so it used Prisma's tight defaults (2s/5s) against an environment
  whose baseline Supabase connection latency is already ~1.7-2s — fixed with a 10s/20s allowance.
  See `docs/build/PHASE_2_PROGRESS.md` for the full breakdown, including required manual Supabase
  dashboard configuration (not in git) and the one known limitation: no sending domain is verified
  in Resend yet (no DNS access available to any candidate domain), so real email delivery is
  restricted to one test address until that's resolved — not a blocker for continued dev, but must
  be fixed before any real trainee/staff email can go out, and is specifically why Account
  Settings' email-change confirmation couldn't be delivery-tested end-to-end.
- **Phase 3 (Evidence & Competency) is built and on `stage`** as of 2026-11-23 — 11 of its 12
  features merged (PRs #13–#22), see `docs/build/PHASE_3_PROGRESS.md` for the per-feature table
  and `docs/plans/phase-3-and-design-migration-kickoff.md`'s progress log for branch/PR/merge-commit
  detail per feature. Evidence is now a per-criterion model end-to-end: real file storage in a
  private bucket, `AssessmentCriterion` per course with an Admin authoring UI, a Reviewer Queue,
  per-criterion Met/Not-Met review with photo annotation, guided per-criterion capture for the
  learner, targeted resubmission that carries already-Met criteria forward, and attempt history.
  **Certification is gated centrally** in `applyEvidenceStatus` (`src/lib/actions/progress.ts`):
  approval is refused unless every `mandatoryForCertification` criterion is Met, for every caller
  — a course with no criteria behaves exactly as it did before.

  Three things to know before building on this:
  1. **Feature #5 (Criteria Authoring Support) is the one open item**, and it isn't engineering —
     it's working sessions with NFCAP's trade experts. Every course currently carries two
     `[PLACEHOLDER]` criteria from `prisma/seed.ts`, so the gating mechanism is real but the
     content it gates on is not.
  2. **Two evidence shapes coexist and both must keep working.** A submission made before feature
     #9 carries its evidence on `EvidenceSubmission` itself (`description`/`fileName`/`filePath`);
     a guided one carries it per criterion on `CriterionAssessment` and leaves the submission's own
     fields empty. `EvidenceSubmission.isPerCriterion` distinguishes them and
     `hasFile`/`hasSubmissionFile` are deliberately different questions — `getEvidenceFileUrl`
     serves only the course-level file, `getCriterionFileUrl` only a criterion's. Feature #12 fixed
     four separate consumers that assumed the legacy shape had gone away; don't reintroduce that
     assumption. Regression coverage lives in `tests/unit/legacy-evidence-regression.test.ts`.
  3. **Nothing is in production.** These are On Stage, not Done; `stage` has not been promoted to
     `main`. The planned verification pass over features #8–#12 — including the visual compare
     against `LRN06d`/`LRN06e`/`LRN06f` — is done as of 2026-11-25.

  Phase 4 (Credential Integrity & Portability) is functionally complete — see below. **"Nothing in
  Phases 5–8 has started" is false for Phase 6 and incomplete for Phase 5** — a full code-level
  verification pass on 2026-11-25, done before starting Phase 5, found real existing work in
  Phase 5 (Stalled-Case Detection ships end-to-end, not backend-only as previously believed) and
  substantial unlabeled progress in Phase 6 (2/8 features fully built, several more with real
  schema+backend work and no UI). Phases 7 and 8 are genuinely close to the floor, each with one
  real exception (colour-contrast tokens; Sentry + `cacheComponents`). Full per-feature evidence:
  `docs/build/CODE_VERIFICATION_AUDIT_2026-11-25.md`. Corrected Phase 5 worklist and the
  Phase-6 regression this surfaced (quiz answers leak on every result screen, `QuizFlow.tsx`):
  `docs/plans/phase-5-funding-productisation-kickoff.md`.
- **WIOA spec-alignment: 6 of 7 gaps resolved, 2026-11-25 (same day as the original audit).** The
  original audit found a real architecture gap — `WioaCase` was built per learner-per-course; the
  spec's data model calls it a "Master student WIOA case," singular per student — plus six
  smaller, independent gaps. That architecture gap is now fully resolved: `WioaCase` is a genuine
  per-student master case (eligibility pipeline, documents, appointments, board/contact/staff
  assignment), with a new `WioaCourseCase` holding just the per-course funding pipeline, only
  reachable once the master is `WIOA_ELIGIBLE`. Two migrations applied to staging and verified
  against real (previously duplicated) data; RLS redesigned around the split; every consumer in
  `src/lib/actions/wioa.ts`/`src/lib/data/wioa.ts`/`src/lib/wioa/status.ts` and every WIOA UI
  component rewritten; live-verified end-to-end as Learner, Coordinator, and Partner Staff
  (including the Reports page's funding aggregation — the highest-risk rewrite — and the
  Coordinator-assigns-Partner-Staff flow). The five smaller gaps (matching's fallback chain,
  Age 18+ check, upload audit logging, stale-contact flagging, failed-email logging) are all
  fixed too, the last via its own small migration. Only automation triggers (dashboard-only, one
  missing entirely) remain open, paused on a product decision (dashboard-only-with-fixes vs. real
  notifications). **Still nothing is committed or pushed** — this is all uncommitted working-tree
  changes on `feature/phase5-funding-productisation`, verified by building/`tsc`/`eslint`/live
  browser walkthroughs, not yet through code review or CI. Full evidence, what changed, and the
  resume plan: `docs/plans/wioa-spec-alignment-kickoff.md`; Phase 5's own feature-by-feature
  status against the new architecture: `docs/build/PHASE_5_PROGRESS.md`.
- **Deployment: self-hosted, VPS + Docker.** Supabase is retained for database and object storage.
  Deploy target was decided 2026-11-01 (VPS + Docker). Replica count is still undecided but isn't a
  blocker — **build for 2+ instances** is already the working assumption everything is built
  against; the final number waits on the Phase 8 scale target.
- The performance audit (`docs/build/PERFORMANCE_PLAN.md`) found 9 issues, F1–F9. **F1–F7 are all
  resolved** — this is a narrower claim than "Phase 0 is done" (see above); don't conflate the two.
  Three items remain open, each deliberately deferred rather than outstanding effort (detail in
  `docs/build/PHASE_0_PROGRESS.md`): Redis + `'use cache'`/`cacheTag` on the curriculum layer
  (blocked on a WIOA-consumer audit), duplicating the staging environment, and the Backup/Restore/
  Recovery Drill (the latter two both blocked on a prod environment existing to duplicate/drill
  against).

## Performance conventions — apply to all new code

These come from `docs/build/PERFORMANCE_PLAN.md` §5. They are cheap to follow per feature and
expensive to retrofit later, which is the entire reason they are written here rather than deferred
to Phase 8.

1. **Never add `export const dynamic = 'force-dynamic'`.** F6, fixed 2026-11-03 — all 15 instances
   resolved (9 removed as redundant, 6 replaced with the scoped `connection()` primitive). Don't
   reintroduce it; use a cached shell with per-user dynamic holes under Suspense instead
   (`cacheComponents` is enabled — see `docs/build/PHASE_0_PROGRESS.md`).
2. **Every route segment gets a `loading.tsx`.** F7, fixed 2026-11-03 — all 31 route segments have
   one, backed by the shared `PageLoading`/`Spinner` in `src/components/ui/`. Keep adding one as new
   routes are built; a retrofit sweep is not free once routes accumulate without it.
3. **Fetch the narrowest shape that works.** F1, fixed 2026-11-03 — `src/lib/data/courses.ts`'s
   `courseInclude` is down to 1 call site (was 13). Do not add new call sites to it; prefer a scoped
   `select`.
4. **No per-entity queries in a loop.** F5, fixed 2026-11-03 — `getProgressByLearner`
   (`src/lib/data/progress.ts:89`) now batches with `where: { learnerId: { in: [...] } } }` and
   groups in memory. Keep following this pattern for new per-entity data fetches.
5. **Keep `'use client'` at the leaves.** 36 of 90 components are client components today.
6. **Nothing inside `$transaction` but database writes.** No uploads, no fetches — a transaction
   holds a Supavisor pooler slot. `src/lib/actions/wioa.ts:187` does this correctly: storage write
   first, then the transaction.

## Error handling convention — Server Actions on data-dependent pages

Added 2026-11-27 after a client demo hit this live on `/coordinator/[caseId]`. A Server Action that
validates by `throw new Error('message')` can have that message silently replaced by a generic,
useless `Minified React error #441` on any page whose component tree shape varies with the data
being rendered (e.g. a form section that disappears entirely once a status goes terminal, or
fields that only render for certain selections) — `cacheComponents` (PPR)'s resumable-tree
reconciliation can mismatch on pages like that, and when it does, a thrown action error gets
swallowed instead of delivered to the client. The validation logic itself isn't broken — confirmed
by checking the production server's own terminal log, which still shows the real message even
though the browser doesn't — but the user sees a crash-looking error with zero actionable
information. Full incident: `CLAUDE.local.md` #11.

**Convention:** for a Server Action that can fail in an *expected* way (validation, business-rule
gating) and is called from a page with data-dependent conditional rendering, return a result
(`{ ok: true } | { ok: false; error: string }`, see `WioaActionResult` in
`src/lib/actions/wioa.ts`) instead of throwing, and have the caller check `result.ok` instead of
try/catch. Reserve `throw` for genuinely unexpected failures (access control, not-found) that
should hit Next's error boundary rather than be shown inline. `advanceWioaEligibilityStatus` and
`updateWioaFunding` already follow this; convert other throw-based actions on similarly
data-dependent pages as you touch them, rather than waiting for another live failure to surface it.

## Known environment issues

- **`git` does not work in agent sessions.** The repo is owned by `sthas` but sessions may run as a
  different Windows user, so git reports "dubious ownership" and exits 128. Fix with
  `git config --global --add safe.directory C:/Users/sthas/Projects/nfcap_lms`. Until then, do not
  rely on git to inspect or revert changes.
- **F4 is fixed.** `src/lib/prisma.ts:7` now reads `DATABASE_URL` (port 6543, Supavisor transaction
  mode) rather than `DIRECT_URL`. The `max: 4` pool cap and the retry extension in that file were
  originally workarounds for the wrong connection string; whether they're still needed with the fix
  in place hasn't been re-evaluated.
- **`next.config.ts`'s Sentry wrapping is gated to `NODE_ENV === 'production'`** (fixed 2026-11-17).
  `withSentryConfig` only earns its keep when `SENTRY_AUTH_TOKEN` is set (CI/deploy, for source-map
  upload), but it was running its bundler instrumentation on every `next dev` cold compile regardless
  — that was the entire cause of ~15-20s first-loads per route in dev (e.g. `/login` took 18.9s, 17.9s
  of it in Next.js itself). Gating it to production dropped that to ~1-2s per route, with zero change
  to production builds, CI, or deploys. Don't remove the gate to "simplify" the config — dev was never
  using what it bought.

## Conventions

- Prettier + ESLint are configured; run `npm run format` and `npm run lint`.
- Prisma client is generated to `src/generated/prisma` — it is checked in and **large**. Exclude it
  from searches; grepping `src/` without excluding it returns the whole inlined schema.
- Code comments reference docs by repo-relative path (`docs/<folder>/<file>`). Keep that habit.
- Vitest + Playwright are installed (`tests/unit/`, `tests/e2e/`), wired into `.github/workflows/ci.yml`.
  Running them needs a local Docker Postgres (`docker-compose.test.yml`) — not available in every
  agent sandbox; CI has it.

## Browser automation (agent-browser)

For ad-hoc manual checks against the running dev server — not a replacement for the Playwright
suite in `tests/e2e/`, which stays the source of truth for regression coverage. `agent-browser` is
a global CLI (`npm install -g agent-browser`, already installed on this machine), not a project
dependency — nothing to add to `package.json`.

1. Start the dev server first: `npm run dev` (default `http://localhost:3000`). agent-browser does
   not start it — it only drives a browser against whatever's already listening.
2. Drive it against that URL:
   ```
   agent-browser open http://localhost:3000/learner
   agent-browser snapshot -i
   agent-browser click @e1
   agent-browser screenshot shot.png
   agent-browser close
   ```
3. Useful for the kind of thing `CLAUDE.local.md` mistake #1 and #5 describe — actually looking at
   a real route with real (not seed-shaped) data before calling a board "done."

## Development approach and Plane (added 2026-11-18, OPS-177)

How we work, on top of everything above. **Read `docs/DEV-APPROACH.md` after `docs/HANDOFF.md`.** It
does not change scope: the build plan in `docs/client/` stays the source of what we build.

- **Two sessions, never one.** The **lead / QC** session owns the design canvas (sitemap, design direction,
  journeys, all mockups), writes a brief per ticket and checks the builder's work against the boards; it
  does not build. The **builder** session builds one ticket per branch and ends every handoff with a
  "Not verified" list; it does not check its own work.
- **Gates in order, each approved before the next:** sitemap (NFCAP-3) → design direction (NFCAP-4) →
  user journeys (NFCAP-5) → all mockups on the canvas (NFCAP-6) → build.
- **Plane is the board** (project NFCAP, workspace `zunkireelabs`). No work without a ticket; search before
  creating. Use `/project-pm` for "status", "what's mine?", "start NFCAP-n", "sync". Plane setup per
  machine: `INSTALL.md`.
- **Branches and states:** `feature/NFCAP-n-short-name` → PR `NFCAP-n: …` to `stage` → `main`.
  In Progress → QC Accepted (lead's acceptance comment) → In Review (PR open) → On Stage (merged to
  `stage`) → Done (live in production). Only Sadin moves a ticket to Client Review.
- **The approver is never the pusher.** Anish approves Manjila's PRs.
- **Approved plans go to `docs/plans/` or the ticket straight away**, never only in chat.
- `tasks/TRACKER.md` is generated by `/project-pm sync`, never hand-edited. While this repo is public,
  don't commit it.
