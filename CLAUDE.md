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
| WIOA module shape and closed decisions | `docs/wioa/WIOA_INTEGRATION_PLAN.md`, `docs/build/WIOA_BUILD_WORKFLOW.md` |
| Design system / tokens | `docs/design/NFCAP_DESIGN_SYSTEM.md` |

Do not reopen decisions already closed in `PRODUCT_CONTEXT.md` or the client scope doc.

## Current state (as of 2026-11-01)

- **The client scope plan is approved.** 65 features, 9 phases, ~1,431h. **Phase 0 is the active
  phase.** Nothing in Phases 1–8 has started.
- **Deployment: self-hosted, VPS + Docker.** Supabase is retained for database and object storage.
  Replica count undecided — **build for 2+ instances.**
- A performance audit (`docs/build/PERFORMANCE_PLAN.md`) found 9 issues, F1–F9. Most map onto
  existing scope line items. Two changes are pending client acceptance: **Bucket B** (~24–32h, must
  land before Phase 1's RLS work) and a **Phase 0 staging correction** (20h → ~40h for VPS + Docker).

## Performance conventions — apply to all new code

These come from `docs/build/PERFORMANCE_PLAN.md` §5. They are cheap to follow per feature and
expensive to retrofit later, which is the entire reason they are written here rather than deferred
to Phase 8.

1. **Never add `export const dynamic = 'force-dynamic'`.** 15 pages currently have it; that is a
   known defect (F6), not a pattern to copy. Use a cached shell with per-user dynamic holes under
   Suspense instead.
2. **Every route segment gets a `loading.tsx`.** Only `src/app/login` has one today (F7). Adding
   them as routes are built is free; a retrofit sweep is not.
3. **Fetch the narrowest shape that works.** `src/lib/data/courses.ts` exposes a single
   `courseInclude` that pulls `sections → lessons → blocks` plus the full assessment, and 13 route
   files use it regardless of need (F1). Do not add call sites to it. Prefer a scoped `select`.
4. **No per-entity queries in a loop.** `getProgressByLearner` (`src/lib/data/progress.ts:92`) is a
   known N+1 (F5). Batch with `where: { id: { in: [...] } }` and group in memory.
5. **Keep `'use client'` at the leaves.** 36 of 90 components are client components today.
6. **Nothing inside `$transaction` but database writes.** No uploads, no fetches — a transaction
   holds a Supavisor pooler slot. `src/lib/actions/wioa.ts:187` does this correctly: storage write
   first, then the transaction.

## Known environment issues

- **`git` does not work in agent sessions.** The repo is owned by `sthas` but sessions may run as a
  different Windows user, so git reports "dubious ownership" and exits 128. Fix with
  `git config --global --add safe.directory C:/Users/sthas/Projects/nfcap_lms`. Until then, do not
  rely on git to inspect or revert changes.
- **`src/lib/prisma.ts:7` reads `DIRECT_URL` (port 5432, session mode) at runtime.** It should read
  `DATABASE_URL` (port 6543, Supavisor transaction mode). This is finding **F4** — a verified
  one-line fix, pre-flight cleared, scheduled as the first task of Phase 0. The `max: 4` pool cap
  and the retry extension in that file are workarounds for the wrong connection string.

## Conventions

- Prettier + ESLint are configured; run `npm run format` and `npm run lint`.
- Prisma client is generated to `src/generated/prisma` — it is checked in and **large**. Exclude it
  from searches; grepping `src/` without excluding it returns the whole inlined schema.
- Code comments reference docs by repo-relative path (`docs/<folder>/<file>`). Keep that habit.
- No test framework is installed yet — Vitest + Playwright arrive in Phase 0.
