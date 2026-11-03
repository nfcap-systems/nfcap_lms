# NFCAP LMS — Session Notes

Running log of work-session context that doesn't belong in a permanent plan doc yet, so nothing
gets lost between sessions. Append a dated entry per session; don't rewrite history.

---

## 2026-11-02

**State at end of session:**

- **F4 applied, not committed.** `src/lib/prisma.ts:7` now reads `DATABASE_URL` (port 6543,
  Supavisor transaction mode) instead of `DIRECT_URL` (port 5432, session mode). Verified
  `DATABASE_URL` in `.env` is the correct pooler connection string with `?pgbouncer=true`.
- **DB migrations applied.** The connected Supabase database (`yykhacznoxcxrhikhbib`) had **0 of 8**
  migrations applied — reachable but schemaless. Ran `npx prisma migrate deploy`; all 8 applied.
  `prisma migrate status` now confirms "Database schema is up to date!"
- **`docs/build/PERFORMANCE_PLAN.md` updated, not committed.** Compared against
  `C:\Users\sthas\Projects\healthcare-hrms\docs\features\PERFORMANCE-OPTIMIZATION-PLAYBOOK.md` (a
  stack-agnostic 10-step performance checklist from another project). Decision: use the playbook
  as the *execution procedure* for Bucket B and Phase 8; `PERFORMANCE_PLAN.md` stays the *what/
  where/when* source of truth. Added to `PERFORMANCE_PLAN.md`:
  - A pointer to the playbook at the top of the doc.
  - Bucket B item 5: run the real bundle analyzer (playbook Step 6) — not previously tracked.
  - §5.1: a WIOA-compliance consumer-audit requirement before the curriculum cache ships (playbook
    Step 2's safety check) — audit whether WIOA eligibility/funding-gating logic reads course data
    through the path about to be cached, since a stale read there would be a compliance risk, not
    just a UX one.
- **Decision: nothing performance-related happens before Phase 0 starts**, per the plan's own
  §4 ("without the Phase 0 instrumentation there are no baselines"). F4 was the only pre-Phase-0
  item, and it's done. Bucket B, caching convention, rate limiting, etc. all wait for Phase 0.
- **Decision: commits are being batched**, not made per-change — the F4 fix and the
  `PERFORMANCE_PLAN.md` edits are intentionally left uncommitted until a later batch commit.
- Earlier in this session: removed the `Co-Authored-By: Claude Sonnet 5` trailer from the
  previously-pushed commit `bdb3c8c` (amended to `37542cf`, force-pushed to `origin/dev`) at the
  user's request — GitHub was rendering a "claude" co-author label on it.

**Not yet done / next session should pick up here:**

- Commit `src/lib/prisma.ts` and `docs/build/PERFORMANCE_PLAN.md` (batched, per user instruction).
- Phase 0 work (`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` lines 127–154) has not
  started. First line item once it does: instrumentation (Error Handling, Logging & Monitoring,
  24h) per the plan's own note that F4 should precede later measurements (already true).
- Two items still pending **client acceptance**: Bucket B (~24–32h) and the Phase 0 staging
  estimate correction (20h → ~40h).

---

## 2026-11-03

**State at end of session:**

- **F4 confirmed still in place** on the current `stage` branch (re-checked directly:
  `src/lib/prisma.ts:7` reads `DATABASE_URL`). Survived the branch rename below.
- **Repo infra changed since 2026-11-02, outside this session.** Default branch renamed
  `dev` → `stage`; `origin/main` now also exists. New commits landed on top of `1810108`:
  `23f150b` added a CI/CD pipeline (`Dockerfile`, `docker-compose.dev.yml`, `.github/workflows/
  ci.yml` + `deploy-staging.yml` — builds on every PR, deploys `stage` pushes to the Corecloud
  VPS via SSH + Docker Compose, Traefik handles TLS). Committed under the `manjila` git identity
  with a Claude co-author trailer, **not** from Sadin's NFCAP-2 work (checked — NFCAP-2 is still
  unstarted in Plane). No Redis cache handler yet (flagged as required in `PERFORMANCE_PLAN.md`
  §5.3), and migrations aren't run automatically in the deploy step.
- **Demo data seeded** into the Supabase DB: 4 courses (`prisma:seed`), 4 demo learners
  (`seed-demo-learners`, password `Demo1234!`), 5 WIOA workforce boards + jurisdictions
  (`prisma:seed-wioa`), WIOA coordinator + partner staff accounts (`seed-wioa-staff`), one WIOA
  learner matched to LA County (`seed-wioa-learner`). All reversible/re-runnable (upserts).
- **Plane investigated for NFCAP.** Project exists (key `NFCAP`) but is essentially empty: only
  2 work items (`NFCAP-1` "Initiation Planning", empty/unassigned; `NFCAP-2` Plane/repo workflow
  setup, assigned to **Sadin**, unstarted). Zero labels, missing `In Review`/`On Stage` states,
  no epics, no `.claude/skills/project-pm/`, no `tasks/TRACKER.md`. NFCAP-2's own description
  explicitly reassigned ownership from Manjila to Sadin on 2026-11-02 ("done the way SuperRank
  was... so Manjila joins a ready project instead of building it").
- **Decision: finish Phase 0 + some UI/UX work directly in this session/chat**, not through
  Plane — UX has no separate budget line, folds into feature hours, reuses the locked design
  system in `docs/design/NFCAP_DESIGN_SYSTEM.md`. Once that's done, **switch to Plane
  (`mcp__plane__*` tools) to track remaining phases 1–8** instead of chat coordination — check
  for an existing NFCAP project first (it exists, see above) before creating epics/work items.
  Saved as memory: `project_phase0_plane_workflow.md`.

**Known open items, not yet acted on:**

1. **Module/phase mismatch in the scope doc:** `NFCAP_LMS_Production_Scope_Summary_Client.md`
   line 77 lists Phase 1 as a delivery phase for the *Reporting & Data* module, but Phase 1's own
   feature table has no Reporting line item. **Flag to the client — don't fix unilaterally,**
   since it's their approved, client-facing doc.
2. Bucket B (~24–32h) and the Phase 0 staging correction (20h → ~40h) remain **pending client
   acceptance** — still not reflected in the scope doc's hour totals.

**Automated Test Suite — Critical Paths (40h): infra + first pass built, same session.**

- Installed Vitest + Playwright (`@types/node` bumped `^20` → `^22`, a vitest peer requirement).
- Test DB: disposable local Postgres via `docker-compose.test.yml` (port 55432) for local runs;
  GitHub Actions' native `postgres:` service container in CI (`tests/setup/db-infra.ts` branches
  on `process.env.CI`) — migrated fresh each run, truncated between test files.
  Decision: **local Docker Postgres, not a Supabase project/schema**, since none of the three
  critical flows depend on RLS or Supabase Auth yet (Phase 1 hasn't landed) — revisit once it
  does.
- Vitest unit tests (`tests/unit/*.test.ts`, 20 cases) call the real exported server actions
  (`src/lib/actions/progress.ts`, `src/lib/actions/wioa.ts`) against the real test Postgres;
  `getAuthUser`/`getRole` (`@/lib/supabase/server`) are mocked (`tests/setup/auth-mock.ts`) so
  real DB-level gating logic runs without a live Supabase session. Covers all three "Done when"
  flows: enrollment gating (OPEN/RESTRICTED + CourseUnlock), evidence → certificate (submit,
  approve/retract), WIOA status transitions (linear order, `WIOA_ELIGIBLE` document gate,
  `TUITION_APPROVED` → `CourseUnlock`, partner-staff case-assignment enforcement).
- Playwright E2E (`tests/e2e/*.spec.ts`, 5 cases) drives the same three flows through the real
  UI. Login goes through real Supabase Auth, so **E2E creates/deletes a throwaway Supabase Auth
  user per test via the service-role admin API** (`tests/e2e/setup/supabase-test-user.ts`) —
  confirmed with the user this is acceptable since app data (courses/enrollments/WIOA cases)
  stays isolated in the ephemeral test Postgres; only Auth user rows touch the real (staging)
  Supabase project, and they're cleaned up immediately after each test.
- `.github/workflows/ci.yml` gained a `test` job: Postgres service container → `npm run test` →
  Playwright browser install → `npm run test:e2e`. Needs `SUPABASE_SERVICE_ROLE_KEY` added to
  the job env (now wired to `secrets.STAGING_SUPABASE_SERVICE_ROLE_KEY`, alongside the existing
  `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`).
- **Not yet verified anywhere** — this machine has no Docker install, so nothing has run locally.
  First real signal is the CI run after this gets pushed.

**Not yet done / next session should pick up here:**

- **Confirm the CI run on this push actually passes** (`test` job) — this is unverified infra;
  expect to debug on the first real run (global setup script paths, Playwright webServer timing,
  Supabase admin API calls needing the right secret name in the `staging` GitHub environment).
- Rest of Phase 0, in order: WIOA Funding Module Sign-Off (24h), Error Handling/Logging/
  Monitoring (24h — Sentry + OTel, self-hosted source maps per `PERFORMANCE_PLAN.md`), Backup/
  Restore/Recovery Drill (14h). None started yet.
- Staging Environment & Migration Strategy item is still only partially done: no Redis cache
  handler yet, migrations aren't run automatically in `deploy-staging.yml`'s deploy step.
- UI/UX work alongside Phase 0, against `docs/design/NFCAP_DESIGN_SYSTEM.md` — not yet scoped to
  specific screens in this session.
- Once Phase 0 + UI work wraps: set up Plane epics (one per module or phase — module was the
  leaning, since modules span multiple phases) and backfill tickets from the scope doc + this
  file's open items, inside the existing NFCAP Plane project (don't create a new one).
