# NFCAP LMS — Performance Findings & Scope Mapping

Performance audit of the current codebase, mapped onto the phases in
`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`. Same convention as
`docs/build/BUILD_WORKFLOW.md` and `docs/build/WIOA_BUILD_WORKFLOW.md` — sequencing and scope for
implementation only. Product decisions remain owned by `docs/product/PRODUCT_CONTEXT.md`.

Authored 2026-11-01 from a research pass on 2026 stack options plus an audit of the data layer,
routing, and build config.

Status legend: ✅ done · 🔲 not started · ⚠️ blocked on an open decision

---

## 1. Headline

**This is not a tenth phase.** Most of what follows is already funded inside Phase 0, Phase 1 and
Phase 8 of the client scope — this doc supplies the concrete findings those line items should be
measured against.

There is **one genuine scope addition** (§4, Bucket B: ~24–32h), **two sequencing changes** (§5),
and **one under-scoped existing line item** surfaced by the self-hosting decision (§5.3: Phase 0
staging, budgeted 20h, realistically ~40h). Net effect on the 1,431h estimate: roughly
**+45–55h**. Bucket B should reduce Phase 1 and Phase 8 risk by more than it costs; §5.3 is not a
new feature but a correction to an existing estimate.

**Deployment decided 2026-11-01: self-hosted on a VPS with Docker** (Hetzner / DigitalOcean class).
Database and object storage stay managed on Supabase. Replica count not yet fixed — **build for 2+**
(§5.3).

### Verdict on the stack

The app already runs what a senior team would pick from scratch in 2026 — Next.js 16, React 19,
Prisma 7, Postgres (Supabase), Tailwind 4. No framework change is warranted.

**Explicitly rejected:** migrating to Drizzle, swapping frameworks (Remix / Qwik / SvelteKit /
Astro), adding tRPC, splitting out a separate API service, Redis-as-cache on Vercel. Prisma 7
dropped its Rust engine for a TS/WASM implementation (~14MB → ~1.6MB) and published comparisons now
put query speed at "comparable for typical web applications." The bottleneck here is query *shape*,
not the ORM.

Targets to hold: **LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1**, at p75 on real-user data.

---

## 2. Audit findings

**F1 — `getAllCourses()` fetches the entire curriculum tree on almost every page.**
`src/lib/data/courses.ts:7` includes `sections → lessons → blocks` *and*
`assessment → questions`. Called from **13 route files**, including `/learner`,
`/learner/portfolio`, `/learner/profile`, `/learner/certificates`. Profile and Certificates need
course *titles* and pull every content block in the catalog. Largest single cost.

**F2 — Learner home runs two near-identical full-tree scans.**
`src/app/learner/page.tsx:14` calls `getAllCourses()` and `getPublishedCourses()`, which differ
only by `isPublished`. One query plus an in-memory filter is equivalent.

**F3 — Then a three-deep sequential waterfall.**
`src/app/learner/page.tsx:15-19` awaits progress map → unlocks → credentials separately. Three
serial round-trips with no interdependency.

**F4 — Prisma is pointed at the wrong connection string.**
`src/lib/prisma.ts:7` uses `process.env.DIRECT_URL`, which `.env.example` documents as the port
**5432 session-mode** connection "used by Prisma for migrations and introspection." `DATABASE_URL`
(the 6543 transaction pooler) is never read at runtime. Supabase's own docs require transaction mode
with prepared statements disabled for serverless. The `max: 4` pool cap and the `$allOperations`
retry-on-"Connection terminated" extension (`src/lib/prisma.ts:27-44`) are band-aids over this.

**F5 — `getProgressByLearner()` is an N+1.**
`src/lib/data/progress.ts:92` maps learner IDs to one `findMany`-with-nested-includes each, fired in
parallel. 200 learners on the admin dashboard = 200 concurrent queries against a 4-connection pool.
Most likely first production outage.

**F6 — Zero caching.**
`cacheComponents` is off and 15 pages carry `export const dynamic = 'force-dynamic'` — several with
comments acknowledging it's because no `revalidatePath` hook exists. Curriculum changes rarely and is
identical for every learner, yet is re-queried per request per user.

**F7 — No `loading.tsx` or `Suspense` anywhere** (only `src/app/login/page.tsx`). Every navigation
blocks on the complete data fetch before painting. Primary cause of *perceived* slowness.

**F8 — Smaller items.** Raw `<img>` at `src/components/learner/LessonContent.tsx:64` bypasses
`next/image`. 36 of 90 components are `'use client'`. `Enrollment` has `@@index([learnerId])` but no
`courseId` index. React Compiler off. No video pipeline. No tests, no Sentry, no OTel.

**F9 — No rate limiting anywhere** in `src/app`, `src/lib`, or `src/components`. `/login` and
`/signup` have no attempt throttling, and `next.config.ts:9` raises the Server Action body limit to
10MB for WIOA uploads with no throttle on that path.

---

## 3. Finding → scope phase ownership

| Finding | Owned by | Existing line item | Change needed |
| --- | --- | --- | --- |
| Instrumentation (OTel / Sentry / RUM) | **Phase 0** | *Error Handling, Logging & Monitoring* — 24h | None — use §2 as acceptance criteria |
| Tests (Vitest / Playwright) · F8 | **Phase 0** | *Automated Test Suite — Critical Paths* — 40h, *CI* — 20h | None |
| **F4** connection string | **Phase 0** | *Staging Environment & Migration Strategy* — 20h | None — fold in |
| Deploy target decision | **Phase 0** | prerequisite of the same staging work | **New decision** — see §6 |
| React Compiler · `cacheComponents` flag · F8 | **Phase 0** | — | Trivial, fold in |
| **F1 · F2 · F3 · F5** | **⚠️ new block** | *none* | **Scope addition** — see §4 |
| **F9** rate limiting | **Phase 1** | *Secrets, Environment & Rate Limiting* — 18h | None — already scoped |
| **F6** caching pattern | **Phase 0/1 → all phases** | Phase 8 *Caching & Media Delivery* — 16h | **Resequence** — see §5 |
| **F7** `loading.tsx` / Suspense | **standing convention** | — | Convention, not a phase |
| Video delivery (Stream / Mux) | **Phase 3** | *Real Evidence File Storage* — 32h | **Resequence** — see §5 |
| Load testing · DB tuning · media tuning | **Phase 8** | *Load Testing & Database Tuning* — 24h | None — correctly placed |

---

## 4. Bucket B — the one scope addition 🔲

**Fix F1, F2, F3 and F5 in a dedicated block between Phase 0 and Phase 1. ~24–32h.**

1. Split `courseInclude` into three selectors — `courseSummary` (title/slug/category/order, no
   tree), `courseOutline` (+ sections/lessons, no blocks), `courseFull` (current shape, detail pages
   only). Migrate all 13 call sites to the narrowest that works. **(F1)**
2. Rewrite `getProgressByLearner` as a single `findMany({ where: { learnerId: { in: ids } } })` plus
   in-memory group-by. **(F5)**
3. Collapse the double full-tree scan on learner home; `Promise.all` the three independent
   follow-ups. **(F2, F3)**
4. Add the indexes `EXPLAIN` proves necessary — start with `Enrollment.courseId`. **(F8)**

**Why this cannot wait for Phase 8**

- **Phase 1 adds Row-Level Access Rules (36h).** RLS attaches policy predicates to every query.
  Against F1 that means evaluating policies across every section, lesson and content block on every
  page load; against F5 it means 200× on the admin dashboard. Writing, testing and debugging RLS on
  the broken query shape is strictly more expensive than on the fixed one — and every policy would
  need re-verifying after a later fix.
- **Phase 3 is 260h built directly on this data layer**, including a *Reviewer Queue* that
  aggregates across learners — the exact `getProgressByLearner` pattern. Building it on the N+1
  replicates the defect into the largest phase of the project.
- **Phase 1's *Hour-Derivable Progress History* (8h)** modifies the same progress code this block
  rewrites. Done separately, that code gets edited twice.

**Why not before Phase 0:** without the Phase 0 instrumentation there are no baselines, so none of
these fixes can be shown to have worked.

---

## 5. Sequencing changes 🔲

### 5.1 Caching becomes a convention, not a Phase 8 retrofit

Phase 8 budgets **16h** for *Caching & Media Delivery*. That is reasonable for *tuning* an app that
already has cache boundaries. It is not enough to *retrofit* caching into 65 features each built
with `export const dynamic = 'force-dynamic'` — which is the pattern the codebase currently teaches
(15 pages already do it). **This is a scope risk in the current estimate.**

Instead:

- **Phase 0/1 (small):** enable `cacheComponents`; establish `'use cache'` + `cacheTag('courses')`
  on the curriculum layer. `src/lib/actions/courses.ts` already has the `revalidatePath` calls to
  convert to `revalidateTag`.
- **Phases 2–7:** every new page is built on that pattern — cached shell, per-user dynamic holes
  under Suspense. Near-zero marginal cost per feature.
- **Phase 8:** the 16h does what it was budgeted for — tuning and media delivery against real data.

Same logic applies to **F7**: `loading.tsx` and Suspense boundaries are free if applied as each
route is built, and a full sweep if deferred. Adopt as a standing convention from Phase 0 onward.

### 5.2 The video decision moves to Phase 3

Journey step 8 is "**photo or video** against each named criterion," and Phase 3 already owns *Real
Evidence File Storage* (32h) and *Image Downscaling & Storage Cost Control* (12h). The media
architecture decision belongs in that decision, not deferred to Phase 8 — storage architecture is
expensive to change once 260h of features depend on it.

Options researched: **Cloudflare Stream** ($5/1k stored min + $1/1k delivered, no egress fees — flat
and predictable) or **Mux** (per-minute, ~100k free delivered min/mo, strongest QoE analytics).
Adaptive HLS either way — not raw files. Also covers lesson video for the Phase 6 Learning module,
and `next/image` for lesson images (**F8**).

### 5.3 Self-hosting consequences — Phase 0 staging is under-scoped

Decided 2026-11-01: **VPS + Docker**, database and object storage remaining managed on Supabase
(which usefully de-risks the hardest part — no self-run Postgres). Replica count undecided; **build
for 2+**, because designing for multi-instance and running one instance is free, while the reverse
requires rework.

**Redis moves from optional to required.** Two independent reasons, so this holds at any replica
count:

- **At 2+ instances:** Next.js's default cache handler is per-instance filesystem, so
  `revalidateTag` reaches only the instance that served the admin's edit. Every other instance keeps
  serving stale curriculum indefinitely. That is a correctness bug.
- **Even at 1 instance:** a container filesystem is ephemeral, so every deploy and restart
  cold-starts the entire cache. Redis makes it durable.

Sessions are already stateless (Supabase JWT cookies), so no sticky-session work is needed.

**Phase 0's *Staging Environment & Migration Strategy* is budgeted 20h.** That was plausible for a
managed platform. On a bare VPS the work is:

| Item | Est. |
| --- | ---: |
| Dockerfile + `output: 'standalone'` + `sharp` (none of which exist today) | 4h |
| Reverse proxy with automatic TLS (Caddy or Traefik) | 4h |
| Compose topology incl. the Redis service | 4h |
| Zero-downtime deploy strategy + health checks | 8h |
| CI pipeline — build, push image, deploy | 8h |
| Duplicate staging environment | 4h |
| Redis cache handler implementation | 8h |
| **Total** | **~40h** |

That is **~+20h against the current line item**, and it is a correction to an existing estimate
rather than a new feature.

**Two further self-hosting costs to absorb:**

1. **Sentry source maps (Phase 0 monitoring, 24h).** Vercel's integration uploads source maps at
   build time; self-hosted, that hook does not exist. Without explicit build-step work **every stack
   trace stays minified**, and the monitoring line item delivers unreadable errors. Likewise the
   OTel collector is now yours to run, or point `@vercel/otel` straight at Sentry over OTLP and skip
   the collector.
2. **`next/image` becomes a CPU cost on your own box (F8).** Self-hosted, optimization runs `sharp`
   in the Node process. Phase 3 is 260h of **photo evidence** features, so this is a genuine capacity
   concern, not a detail. Resolve it inside Phase 3's existing *Image Downscaling & Storage Cost
   Control* (12h) — transform at upload time and/or serve media from a CDN rather than optimizing on
   request.

**Phase 0's *Backup, Restore & Recovery Drill* (14h) also widens** — Supabase covers the database
and stored objects, but host configuration and the deployment topology are now yours to reproduce.
Keep the VPS setup in version-controlled config so the recovery drill is a real rebuild.

**Still blocked on the Phase 8 scale target** (expected concurrent trainees and staff, currently
assumed low thousands): VPS sizing and replica count both depend on it.

---

## 6. Open decisions

Add to §8 of the client scope doc:

| Needed before | Topic | Status |
| --- | --- | --- |
| Phase 0 | Deploy target | ✅ **Decided 2026-11-01** — self-hosted, VPS + Docker; Supabase retained for database and object storage. Consequences in §5.3 |
| Phase 0 | `DATABASE_URL` verification | ✅ **Verified 2026-11-01** — `DATABASE_URL` is the port 6543 transaction pooler with `?pgbouncer=true`; `DIRECT_URL` is 5432. The environment was correct all along; **F4 is a one-line fix in `src/lib/prisma.ts:7`, not a config migration** |
| Phase 0 | F4 pre-flight | ✅ **Cleared 2026-11-01** — no raw queries, no session-level features (no LISTEN/NOTIFY, advisory locks, or `SET SESSION`), and all three `$transaction` calls are short and DB-only. `wioa.ts:187` performs its storage upload *outside* the transaction, so no pooler slot is held across network I/O. Safe to switch to transaction mode |
| **Phase 0** | **Replica count** | ⚠️ **Open** — undecided. Build for 2+ regardless (§5.3). Depends on the Phase 8 scale target |
| **Phase 0** | **Staging scope correction** | ⚠️ **Open** — accept the ~40h revision to *Staging Environment & Migration Strategy* (§5.3), or cut scope (e.g. accept brief deploy downtime instead of zero-downtime, −8h) |
| **Phase 3** | Media delivery provider | ⚠️ **Open** — Cloudflare Stream vs Mux (§5.2), decided alongside *Real Evidence File Storage*. More urgent now that self-hosting makes in-process image optimization a capacity cost |
| **Phase 8** | Scale target | ⚠️ **Open** — already in the client scope doc. Expected concurrent trainees and staff, currently assumed low thousands. Now also gates VPS sizing and replica count, not just load-test targets |

### Note on one assertion still unverified

`?pgbouncer=true` is a Prisma *query-engine* flag, and this project uses `@prisma/adapter-pg`
(node-postgres), which does not go through that path. node-postgres does not issue named prepared
statements unless a query is explicitly given a `name`, so transaction mode should be compatible
as-is — but confirm against real traffic rather than assuming it.

---

## 7. Research basis

| Lever | Evidence | Applies here |
| --- | --- | --- |
| Cache Components / `use cache` | Next 16's headline feature; PPR folded into it. Opt-in via `cacheComponents` | Biggest single win. Not enabled. |
| React Compiler | Wakelet production: LCP −10%, INP −15%, ~30% on pure components. Meta/Instagram: ~3% avg | Real but modest. One flag. |
| Supavisor pooling | Supabase docs: serverless must use transaction mode (6543), prepared statements off; 5432 is migrations only | **F4** — currently misconfigured |
| RSC alone | Benchmarks show RSC gives nothing unless data fetching is restructured around it | Have RSC, still have the old fetch shape |
| Video delivery | Cloudflare Stream $5/1k stored + $1/1k delivered, no egress. Mux ~100k free delivered min/mo | §5.2 |
| Observability | Next 16 stabilized `instrumentation.ts`; `@vercel/otel` works self-hosted; Sentry accepts OTLP directly | Phase 0 |

### Sources

- [Next.js 16 release](https://nextjs.org/blog/next-16)
- [Next.js OpenTelemetry docs](https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry)
- [Supabase Prisma guide](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/prisma.mdx)
- [Supabase Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
- [Wakelet: React Compiler in production](https://github.com/reactwg/react-compiler/discussions/52)
- [DebugBear on React Compiler](https://www.debugbear.com/blog/react-compiler)
- [RSC performance benchmark (developerway)](https://www.developerway.com/posts/react-server-components-performance)
- [Prisma 7 vs Drizzle](https://techsy.io/en/blog/prisma-vs-drizzle-orm)
- [Drizzle vs Prisma 2026](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Mux: best video APIs](https://www.mux.com/articles/the-best-video-apis-right-now)
- [Video stack comparison](https://leanopstech.com/blog/mux-vs-cloudflare-stream-vs-cloudfront-2026/)
- [Next 16 instrumentation.ts](https://dev.to/jsmanifest/nextjs-16-instrumentationts-is-stable-wiring-opentelemetry-sentry-and-custom-spans-without-a-46dc)
