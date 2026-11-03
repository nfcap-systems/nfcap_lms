# Phase 0 Progress

Working log of Phase 0 execution against `docs/build/PERFORMANCE_PLAN.md`. Update this as status
changes; `CLAUDE.md` links here instead of restating detail.

## Status as of 2026-11-03

**Phase 0 code work is functionally complete.** Everything below that's marked done was verified
this session (typecheck, lint, and either a real build or, where noted, reasoning from traced code
— see each item). Two items remain, both genuinely blocked rather than outstanding effort — see
"Open" below.

### Done

| Item | Evidence |
| --- | --- |
| **F4** — `prisma.ts` read `DIRECT_URL` instead of `DATABASE_URL` | Already fixed on this branch before this session; confirmed by reading `src/lib/prisma.ts:7` |
| **Sentry / instrumentation** | `@sentry/nextjs` wired end-to-end: `src/instrumentation.ts`, `src/sentry.{server,edge}.config.ts`, `src/instrumentation-client.ts`, `next.config.ts`'s `withSentryConfig`, error boundaries. DSN/org/project/auth-token live in `.env`. Verified with a real test event delivered to Sentry (confirmed via screenshot of the Issues feed) |
| **F1 / Bucket B narrowing** | `courseInclude` down to 1 call site (was 13) |
| **F2 / F3** | Learner home collapses to `Promise.all` (`src/app/learner/page.tsx:14`) |
| **F5** | `getProgressByLearner` (`src/lib/data/progress.ts:89-104`) rewritten from N parallel queries to one batched `findMany({ where: { learnerId: { in: ... } } })`, grouped in memory |
| **F6** | All 15 `export const dynamic = 'force-dynamic'` resolved — 9 removed as redundant (already dynamic via `cookies()` in a guard call, or fully covered by existing `revalidatePath`), 6 replaced with the scoped `connection()` primitive (Supabase-Auth-roster reads with no revalidation hook — confirmed `src/app/signup/SignupForm.tsx` is a pure client component with no server action to hook `revalidatePath` into) |
| **F7** | `loading.tsx` added to all 31 route segments under `src/app/`; shared `Spinner`/`PageLoading` primitive added to `src/components/ui/` |
| **React Compiler** | `babel-plugin-react-compiler` installed, `reactCompiler: true` in `next.config.ts`, verified via clean `next build` |
| **`cacheComponents`** | Enabled (`cacheComponents: true`). Verified via `next build`: routes went from fully dynamic (`ƒ`) to Partial Prerender (`◐`) — worked cleanly because F7's `loading.tsx` sweep already provides the Suspense boundary PPR needs. **No `'use cache'`/`cacheTag` added** — this only changes rendering/streaming, not data freshness, so it carries none of the staleness risk (see Open, below) |
| **Zero-downtime deploy** | `docker-compose.dev.yml` — removed fixed `container_name` (was blocking two instances running at once), added Traefik load-balancer health-check labels. `.github/workflows/deploy-staging.yml` — blue/green swap: new color starts, Traefik load-balancer health-checks it, old color only torn down after the new one is confirmed healthy; on failure the old color is left untouched. **Not tested against the real VPS** — no SSH access or local Docker in this environment. Treat the next push to `stage` as the real test |
| **`output: 'standalone'` + `sharp`** | `Dockerfile` copied `.next/standalone`, but `next.config.ts` never set `output: 'standalone'` — the Docker build would have failed outright at that `COPY` step. Fixed; confirmed `.next/standalone/server.js` now exists after `next build`. Added `sharp` as an explicit dependency (was only transitive via `next`) for production `next/image` optimization |
| Test infra (Vitest + Playwright) + CI | Already existed: `tests/unit/*`, `tests/e2e/*`, `.github/workflows/ci.yml` (build + test), `.github/workflows/deploy-staging.yml`. **Could not actually run `npm run test`** — it needs a local Docker Postgres (`docker-compose.test.yml`) and Docker isn't available in this sandbox. Structurally sound on inspection; unverified by execution here |

### Open — both are blocked, not pending effort

1. **Redis + `'use cache'`/`cacheTag` on the curriculum layer.** No Redis service exists, and
   nothing uses `'use cache'` yet — deliberately. Sequencing reason: curriculum data is read by
   more than the learner pages being optimized (WIOA eligibility/funding-gating logic may read the
   same data through a different path per `PERFORMANCE_PLAN.md` §5.1) — caching it before auditing
   every consumer risks a stale-eligibility bug, not just a UX one. Order has to be: audit
   consumers → decide what's cacheable → design the cache-tag scheme → Redis backs it. Not a
   blocker for Phase 1+ feature work; it's a "cheaper now than after more pages exist" tradeoff,
   same as F7 was before this session.
2. **"Duplicate staging environment"** (`PERFORMANCE_PLAN.md` §5.3 line item). Only one
   environment exists today (`dev-nfcap.corecloud365.com`). There's no prod environment yet to
   duplicate staging *from/against* — this becomes real work once there's an actual go-live target.

### Corrections made to stale tracking during this session

- `CLAUDE.md`'s "Current state" said deploy target was pending — it was actually already ✅ decided
  2026-11-01 per `PERFORMANCE_PLAN.md` §6. The real open item there was "replica count," which
  isn't a Phase 0 blocker (plan already assumes "build for 2+").
- "Staging scope correction (20h → ~40h)" is effectively moot now — the underlying engineering
  (zero-downtime deploy, `output: 'standalone'`) is done rather than needing a budget decision to
  proceed.

### Known gaps unrelated to Phase 0 scope (flagged, not actioned)

- `npm audit` surfaced a **critical** pre-existing Next.js RCE advisory, fixed in `next@16.4.4`.
  Deliberately not bundled into this session's work — needs its own deliberate upgrade pass.
