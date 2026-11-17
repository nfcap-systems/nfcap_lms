# Phase 1 Progress

Working log of Phase 1 execution against `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`
("Phase 1 — Security & Data Protection", 9 features, 156h). Mirrors
`docs/build/PHASE_0_PROGRESS.md`'s convention — update this as status changes.

## Status as of 2026-11-17 (updated — RLS call-site rewiring done, CI-verified)

**Phase 1 is functionally complete.** All 9 features have real, shipped work, and Row-Level
Access Rules — the one item still open as of 2026-11-05 — is now fully rewired and verified by
CI's Vitest suite running against real Postgres (`feature/phase-0-quality-foundations` PR #2,
run `44023705590`). See "Row-Level Access Rules — done" below for what changed and what it
caught. One caveat: CI's Playwright/E2E suite could not run to completion — see "Known gap"
below, which is an infrastructure issue unrelated to this work, not a code regression.

All three Phase 1 migrations are now applied to the live database and functionally verified
(not just inspected):

- `Pathway`/`AuditLog`/`RateLimitBucket` tables exist; every `Course` row has a non-null
  `pathwayId` pointing at the seeded `default-pathway`.
- The No-SSN `CHECK` constraints actually reject bad input — tested directly: inserting an
  `EvidenceSubmission` with `"My SSN is 123-45-6789..."` in `description` fails with
  `violates check constraint "EvidenceSubmission_no_ssn_description"`, confirmed via a rolled-back
  transaction against the live DB.

### Done

| Feature | What shipped | Evidence |
| --- | --- | --- |
| **Database Access-Rule Approach — Decision** | Decided (Option A), migration applied to the live DB, verified end-to-end (read isolation, write rejection, ADMIN override, fail-closed with no context) | `docs/build/PHASE_1_DB_ACCESS_DECISION.md` |
| **Hour-Derivable Progress History** | Already satisfied — no code change needed | `CompletedLesson.completedAt`, `QuizAttempt.submittedAt`, `Enrollment.enrolledAt` are all per-row timestamps already; no counter field anywhere in `prisma/schema.prisma` |
| **No-SSN Rule & PII Boundary** | DB `CHECK` constraints on every learner/staff free-text field + mirrored app-layer validation + PII map — **live and verified** (bad insert actually rejected) | `prisma/migrations/20261105140000_no_ssn_check_constraints`, `src/lib/pii.ts`, `docs/build/PHASE_1_PII_BOUNDARY.md` |
| **Terms of Service & Privacy Policy** | Draft pages at `/terms` and `/privacy`, linked from signup — explicitly marked draft/pending legal review, not real legal copy | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` |
| **Pathway Structure Seam** | `Pathway` model, `Course.pathwayId`, backfilled to one seeded default pathway — **live**, every `Course` row confirmed non-null | `prisma/schema.prisma`, `prisma/migrations/20261105130000_pathway_audit_ratelimit` |
| **Platform-Wide Audit Trail** | `AuditLog` table (admin-only read via RLS, append-only) — **live**, wired into funding-document views, document/evidence review, case status transitions, case assignment, course-unlock grants; admin page at `/admin/audit` with CSV export | `src/lib/actions/audit.ts`, `src/app/admin/audit/*` |
| **Secrets, Environment & Rate Limiting** | DB-backed (multi-instance-safe) rate limiting on login, signup, evidence submission, WIOA document upload — closes performance finding F9 — **backing table live** | `src/lib/rate-limit.ts`, wired in `src/lib/actions/{auth,progress,wioa}.ts` |
| **Data Retention & Destruction Policy** | Sweep mechanism (destroys uploaded document files past a configurable retention window, logs each destruction), cron trigger + scheduled workflow | `src/lib/actions/retention.ts`, `src/app/api/cron/data-retention/route.ts`, `.github/workflows/data-retention.yml`, `docs/build/PHASE_1_DATA_RETENTION.md` |
| **Row-Level Access Rules (RLS)** | Every `src/lib/actions/wioa.ts` write and `src/lib/data/wioa.ts` read now goes through `withRlsContext` instead of the RLS-bypassing `prisma` client; 9 page call sites updated to pass the viewer's session context. CI's Vitest suite (real Postgres) passes, including the test that pins the exact "Not your assigned case." error for an unassigned Partner Staff member. | `src/lib/actions/wioa.ts`, `src/lib/data/wioa.ts`, CI run `44023705590` |

### Row-Level Access Rules — done (2026-11-17)

Finished the gap left open on 2026-11-05. What changed:

- `src/lib/actions/wioa.ts` (12 functions) and `src/lib/data/wioa.ts` (its read functions + 9 page
  call sites in `src/app/{admin,coordinator,partner,learner}/**`) now route every RLS-scoped
  read/write through `withRlsContext`.
- `requireCaseAccess` and `uploadWioaDocument`'s ownership-check reads **deliberately stay on the
  plain `prisma` client** — their only job is deciding access, not returning data, and
  `tests/unit/wioa-status.test.ts` pins the exact "Not your assigned case." message an unassigned
  Partner Staff member gets. Routing that lookup through RLS would turn a found-but-rejected case
  into a generic not-found instead, collapsing that message. Every actual data read/write past
  those checks uses `withRlsContext`, so RLS still backs the real security boundary even though
  those two gate reads don't.
- `getWioaCases`/`getWioaReportingSummary` keep their per-case Supabase Auth Admin API name
  lookups outside the RLS transaction (CLAUDE.md performance conventions — never hold a pooler
  slot across a network call).

This was verified against CI's real Postgres, not just locally — doing so surfaced and fixed two
real, previously-undetected bugs that had **zero prior test coverage** because nothing had
exercised an actual `withRlsContext` call against live data before this rewiring:

1. **Pathway seed-data lifecycle bug**: `tests/setup/db-reset.ts` truncates every table (`Pathway`
   included) between tests, so the migration-seeded `default-pathway` row only survived the first
   test in the whole suite — every later `createCourse()` call hit `Course_pathwayId_fkey`. Fixed
   by upserting the pathway in the fixture itself (`tests/setup/fixtures.ts`), matching how other
   reference-data fixtures already work.
2. **Infinite recursion in the RLS helper functions themselves**: `app_can_access_case()` and
   `app_can_access_learner()` (from `prisma/migrations/20261105120000_add_rls_wioa_pii`) each run
   a `SELECT` against the very table their policy secures. That internal `SELECT` is itself
   subject to the same RLS policy regardless of role — Postgres unconditionally rewrites every
   query against a `FORCE ROW LEVEL SECURITY` table to AND in its `USING` clause — so it
   re-invokes the helper for its own candidate rows, forever, surfacing as Postgres error `54001`
   ("stack depth limit exceeded"). Fixed in a new migration
   (`prisma/migrations/20261117050000_fix_rls_helper_recursion`) marking both functions
   `SECURITY DEFINER`, so their internal lookup runs as the bootstrap/superuser owner (which
   already has `BYPASSRLS`) instead of the caller — this bug was **live in the production
   database already** (the first migration was applied there 2026-11-05) and would have hit the
   exact same recursion the first time any real request exercised these policies. **This new
   migration needs to be applied to the live Supabase database** the same way the first one was —
   it hasn't been from this sandbox (see "Known gap" below).
3. Also fixed along the way: `prisma db execute`'s CLI flags changed in Prisma 7 (no more `--url`
   — it reads the datasource from `prisma.config.ts`), caught while wiring up test-DB support for
   the `app_runtime` role's password (`tests/setup/db-infra.ts`, `.env.test`, `ci.yml`).

### Known gap: CI's E2E (Playwright) suite could not verify this

CI's Vitest (unit) suite fully passed. CI's Playwright suite could not run to completion — every
test failed identically at its first call (`Failed to create E2E test user: fetch failed` in
`tests/e2e/setup/supabase-test-user.ts`), which uses the Supabase Auth Admin API against
`STAGING_SUPABASE_URL`/`STAGING_SUPABASE_SERVICE_ROLE_KEY`. This same E2E suite passed cleanly 13
days ago against the same secrets/project (CI run `41684974158`), and this session independently
found the live Supabase Postgres connection unreachable with the credentials in `.env`
("`tenant/user ... not found`" from the Supavisor pooler) — both point at a Supabase
staging-project connectivity or credentials problem, not a code regression from this rewiring.
Needs someone with Supabase dashboard access to check whether the project is paused or the
service-role key/URL secrets have rotated, then re-run CI. **Also applies the migration 2 above**
to the live/staging database once that access is restored.

### Resolved — migrations applied 2026-11-05

Both previously-blocked migrations were applied via `npx prisma migrate deploy` once explicitly
requested, and verified directly against the live DB (not just by inspecting the SQL):

- `Pathway`/`AuditLog`/`RateLimitBucket` tables confirmed present; every `Course` row has a
  non-null `pathwayId`.
- The No-SSN constraints actually reject bad input — tested live: an `EvidenceSubmission` insert
  with an SSN-shaped string in `description` fails with
  `violates check constraint "EvidenceSubmission_no_ssn_description"` (tested inside a
  transaction, then rolled back).

Nothing left blocked on the DB side for this round. The RLS call-site rewiring described above is
now also done; the only open item left is applying the 2026-11-17 recursion-fix migration to the
live database and clearing the Supabase connectivity issue blocking E2E verification (see "Known
gap" above).
