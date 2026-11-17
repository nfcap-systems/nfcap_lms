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
| WIOA module shape and closed decisions | `docs/wioa/WIOA_INTEGRATION_PLAN.md`, `docs/build/WIOA_BUILD_WORKFLOW.md` |
| Design system / tokens | `docs/design/NFCAP_DESIGN_SYSTEM.md` |

Do not reopen decisions already closed in `PRODUCT_CONTEXT.md` or the client scope doc.

## Current state (as of 2026-11-17)

- **The client scope plan is approved.** 65 features, 9 phases, ~1,431h. **Phase 0 is in progress,
  not complete** — 3 of its 6 scoped features are done (Automated Test Suite, Automated Checks/CI,
  Error Handling & Monitoring); see `docs/build/PHASE_0_PROGRESS.md` for the full per-feature
  breakdown, including the 3 that are still open or uncredited (Staging Environment & Migration
  Strategy is partial — migrations aren't automated in the deploy step; WIOA Funding Module
  Sign-Off has real verification work behind it but was never formally credited against this item;
  Backup, Restore & Recovery Drill is deferred to pre-launch).
- **Phase 1 (Security & Data Protection) is functionally complete** as of 2026-11-17, pending PR
  #2 merge — all 9 scoped features have real, shipped work; see `docs/build/PHASE_1_PROGRESS.md`
  for the full breakdown. Row-Level Access Rules (the item still open as of 2026-11-05) is now
  rewired end-to-end: `src/lib/actions/wioa.ts` and `src/lib/data/wioa.ts` go through
  `src/lib/db/rls.ts`'s `withRlsContext` instead of the RLS-bypassing `prisma` client, verified by
  CI's Vitest suite against real Postgres (not available in every agent sandbox — CI has it).
  That run also surfaced and fixed two previously-uncaught bugs with zero prior test coverage: a
  test-fixture/seed-data lifecycle bug, and **infinite recursion in the RLS helper functions
  themselves** (`app_can_access_case`/`app_can_access_learner`, fixed in migration
  `20261117050000_fix_rls_helper_recursion` — this recursion bug is live in the production
  database already and still needs that migration applied there). CI's Playwright/E2E suite could
  not verify this round — every E2E test failed identically on its first Supabase Auth Admin API
  call, which also passed cleanly 13 days earlier against the same secrets, pointing at a Supabase
  staging-project connectivity/credentials issue rather than a code regression. Nothing in Phases
  2–8 has started.
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
