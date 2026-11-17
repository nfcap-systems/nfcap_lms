# Database Access-Rule Approach — Decision

Phase 1, feature 1 of 9 (`docs/client/NFCAP_LMS_Feature_Detail_Client.md` line 37). Gates *Row-Level
Access Rules (RLS)* (36h) — nothing there should be written until this is settled.

**Decided 2026-11-05: Option A, connection-strategy 1.** Scope to WIOA/PII tables first.

## The problem

`src/lib/prisma.ts` connects via `DATABASE_URL`, which per `.env.example` is:

```
postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true
```

That's the `postgres` role — Supabase's default superuser, and the owner of every table in the
schema. In Postgres, **superusers and table owners bypass Row-Level Security unconditionally**,
including on tables marked `FORCE ROW LEVEL SECURITY`. If RLS policies were added today exactly as
scoped, they would compile, attach, and then silently never execute against anything Prisma does —
every query already runs as a role RLS doesn't apply to. That's precisely the "false confidence"
risk the feature description warns about, and why this has to be settled in evidence before policy
work starts.

Confirmed in code: `src/lib/data/learners.ts` and friends go through the one shared `prisma` client
in `src/lib/prisma.ts:1-44`; there's no per-request role switch anywhere in the data layer today.

**Confirmed empirically against the real Supabase project** (read-only check, 2026-11-05):

```
select rolname, rolsuper, rolbypassrls from pg_roles where rolname = current_user;
 rolname  | rolsuper | rolbypassrls
----------+----------+--------------
 postgres | false    | true
```

Supabase's managed Postgres doesn't expose a true superuser (Supabase itself holds that) — but the
`postgres` role it gives every project is granted `BYPASSRLS` directly, and it still owns every
table Prisma created. Either property alone is enough to skip RLS entirely; this project's runtime
connection has both.

## What's already covering this risk (app layer)

Before deciding whether DB-level rules are worth the cost, worth being precise about what's already
in place, so the decision is "what does RLS add," not "is there nothing today":

- `src/lib/actions/guard.ts` — `requireUser`/`requireAdmin`/`requireCoordinator`/`requirePartnerStaff`
  run at the top of every server action and throw before any query runs.
- Learner-scoped writes derive the id from the session, not from client input —
  `src/lib/actions/progress.ts`'s `enroll`/`markLessonComplete`/`recordQuizAttempt`/`submitEvidence`
  all call `requireUser()` and use `user.id`, never a learner id passed in from the caller.
- The one place a learner id *is* passed as an argument (`setEvidenceStatus`, `grantCourseUnlock`)
  is admin/partner-staff-only, gated by `requireAdmin`/role check first.

This is real, and it's why the client scope doc's "Done when" line reads *"Database-level access
rules are in place, **or a documented alternative with compensating controls**"* — app-level-only is
a contractually acceptable outcome here, not a corner being cut silently.

## Options

### A — Dedicated non-owner runtime role + session-scoped RLS predicates

Create a Postgres role (e.g. `app_runtime`) that is **not** a superuser and **does not own** the
tables, used for the pooled runtime connection in place of `postgres`. Enable
`FORCE ROW LEVEL SECURITY` on sensitive tables (`LearnerProfile`, `WioaCase`, `EvidenceSubmission`,
funding documents, etc.). Policies read session context set via `SET LOCAL app.user_id = '<uuid>'`
/ `app.user_role = '<role>'`, referenced in policy predicates through `current_setting(...)`.

**The real cost is pooling mode, not the policies.** Supavisor's transaction-mode pooler (port
`6543`, what `DATABASE_URL` already points at) hands out a connection per *transaction*, not per
session — so `SET LOCAL` is safe there (it's transaction-scoped and resets automatically), but only
if the `SET LOCAL` and every query that depends on it share one transaction. That means every
RLS-scoped read now has to run inside a `$transaction`, which is in direct tension with the
performance convention already written down in `CLAUDE.md` #6: *"Nothing inside `$transaction` but
database writes... a transaction holds a Supavisor pooler slot."* Wrapping reads in a transaction
just to carry a GUC adds exactly the pooler-slot pressure that convention exists to avoid, on a
Supabase tier where `src/lib/prisma.ts` already caps the pool at `max: 4` because concurrent
connections are scarce.

Two ways to resolve that, neither free:
1. Accept short, single-purpose transactions for RLS-scoped reads (the GUC `SET LOCAL` + the one
   query, nothing else inside it) — keeps the existing pooled connection, costs a pooler slot per
   read instead of per write.
2. Route RLS-scoped reads through `DIRECT_URL` (session-mode, port `5432`) instead, where plain
   session-level `SET` is safe without wrapping every read in a transaction — but that's the
   connection currently reserved for migrations, and session-mode has its own low connection-count
   ceiling on Supabase's tier.

Either way, this is a connection-strategy decision, not just a policy-writing one, and it needs to
be made explicitly rather than discovered mid-implementation.

### B — Route reads through Supabase's PostgREST/Auth layer

Supabase's native RLS story assumes queries arrive via PostgREST or the Supabase client with a
user's JWT, so `auth.uid()` resolves for free. Not realistic here — the whole data layer is Prisma
+ server actions, and the Supabase client (`src/lib/supabase/*`) is only ever used for Auth/Storage,
never for data queries. Rejected: would mean rebuilding every data-access function, far outside what
a 36h RLS budget assumes.

### C — Skip DB-level RLS; compensating controls only

Formally document the app-layer guarantees above as the control, with a review checklist (every
new data-access function gets a learner/role-scoping check verified at PR review, same spirit as
the performance conventions in `CLAUDE.md`) instead of a second enforcement layer. Contractually
valid per the "Done when" line. Cheaper (no 36h RLS build, no connection-strategy rework) but weaker
for exactly the data the feature description calls out RLS as the *primary* protection for — WIOA
funding records and PII.

## Recommendation

**Option A**, with connection-strategy choice **1** (short single-purpose transactions for
RLS-scoped reads over the existing pooled connection) — it keeps one connection string strategy
rather than splitting reads across two pools, and the hit is bounded to tables that actually carry
RLS predicates, not every read in the app.

Scope this to the tables that hold WIOA/PII data first — `LearnerProfile`, `WioaCase`,
`EvidenceSubmission`, funding documents — rather than every table, so the 36h RLS budget buys
protection where the feature description says it matters most, and course/curriculum reads (already
optimized under F1/F2/F3/F5) aren't forced into per-query transactions for no compliance benefit.

**Before implementation starts, also note:** `docs/build/SESSION_NOTES.md` flags that the test
database (`docker-compose.test.yml`) currently runs with no RLS and mocked auth
(`tests/setup/auth-mock.ts`) — "revisit once [Phase 1] lands." Building RLS policies means the test
suite needs a real `app_runtime`-equivalent role and real session-context setup in at least an
integration-test tier, or RLS policies ship with no automated coverage.

## What's been built

- `prisma/migrations/20261105120000_add_rls_wioa_pii/migration.sql` — creates `app_runtime`
  (non-superuser, no BYPASSRLS, doesn't own any table), grants it CRUD on the schema, and enables +
  forces RLS with policies on `LearnerProfile`, `WioaCase` and its direct children
  (`WioaStatusHistory`, `Appointment`, `WioaCommunication`, `WioaDocument`, `WioaDocumentVersion`),
  `EtplFundingRequest`/`FundingAuthorization`, and `EvidenceSubmission`. Policy logic is centralized
  in two SQL helper functions (`app_can_access_learner`, `app_can_access_case`) mirroring the role
  rules already in `src/lib/actions/guard.ts`.
- `src/lib/db/rls.ts` — a second Prisma client (`rlsPrisma`) authenticated as `app_runtime`, plus
  `withRlsContext(ctx, fn)`, which sets `app.user_id`/`app.user_role` via `set_config(..., true)`
  inside one transaction (the parameterized equivalent of `SET LOCAL` — binds through
  `$executeRaw`, never string-interpolated) and runs `fn` against it.
- `.env.example` documents the new `APP_RUNTIME_DATABASE_URL` var.

**Not done yet, and bigger than this pass:** no call site has been switched over.
`src/lib/actions/wioa.ts`, `src/lib/data/learners.ts`, and the evidence-review path in
`src/lib/actions/progress.ts` still read/write the scoped tables through the plain `prisma` client
— which, once this migration is applied, will start getting blocked by its own policies' `WITH
CHECK` on writes (reads still succeed today only because `postgres` bypasses RLS; after this lands
the bypass is gone, so any caller still on `prisma` for a scoped table fails). Rewiring those call
sites to `withRlsContext` is the remainder of the 36h RLS budget.

## Applying this migration — not done yet

This has **not** been run against the live project. Before `prisma migrate deploy` touches it:

1. Run the migration (it only creates the role/policies — doesn't change `postgres`'s access, so
   nothing breaks for the still-unwired call sites yet).
2. Set `app_runtime`'s password out-of-band, never in git: connect as `postgres` and run
   `ALTER ROLE app_runtime WITH PASSWORD '<generated>';`, then put the resulting connection string
   in `.env` only. Supabase's shared pooler expects the `<role>.<project-ref>` username format the
   real `DATABASE_URL` already uses (`postgres.yykhacznoxcxrhikhbib`) — so this will be
   `app_runtime.yykhacznoxcxrhikhbib`, not bare `app_runtime`.
3. Smoke-test `withRlsContext` against a real session before rewiring any call site — confirm a
   learner session can read their own `LearnerProfile` row and not another learner's, and that
   `ADMIN`/`WIOA_COORDINATOR` still see everything.
4. Only then start moving call sites over, table by table, so a broken policy surfaces against one
   feature instead of all of WIOA/evidence at once.

There's no staging duplicate of this Supabase project yet (`PHASE_0_PROGRESS.md`), so step 1 runs
directly against the only real database. It's additive and reversible (`DROP POLICY`/`DROP ROLE`
cleanly undo it, and nothing reads through `app_runtime` yet) — but flagging that explicitly since
it's still a live-database change with no rehearsal environment behind it.

## Applied and verified — 2026-11-05

Migration ran against the live project via `prisma migrate deploy`. Confirmed directly against
Postgres, not just by inspecting the SQL:

- `app_runtime`: `rolsuper = false`, `rolbypassrls = false`, `rolcanlogin = true` — not a superuser,
  doesn't skip RLS.
- All 10 scoped tables: `relrowsecurity = true`, `relforcerowsecurity = true`. All 10 policies
  present (`pg_policy`).
- Functional test against `APP_RUNTIME_DATABASE_URL`, using the one real `LearnerProfile` row:
  - Session context = that learner → sees their own row (1).
  - Session context = a different learner id → sees 0 rows.
  - Session context = `ADMIN` → sees all rows.
  - No session context set at all → sees 0 rows (fails closed, not open).
  - Attempted `INSERT` of a `LearnerProfile` row under someone else's `learnerId` while in a
    `LEARNER` session → rejected: `new row violates row-level security policy`.

`app_runtime`'s password was generated and set directly via `ALTER ROLE`, never logged or printed;
`APP_RUNTIME_DATABASE_URL` was written straight into `.env` by the script that set it.

**Still open:** no application code uses `app_runtime`/`withRlsContext` yet — `wioa.ts`,
`learners.ts`, and the evidence-review path in `progress.ts` all still run through the
bypass-RLS `prisma` client. The policies are proven correct in isolation; wiring real call sites
onto them is the remaining RLS work.

## Open question — resolved

~~Does Option A / connection-strategy 1 match your risk tolerance...~~ **Decided: Option A,
connection-strategy 1.** The remaining open item is a go/no-go, not a design choice: this session
has a working `DATABASE_URL` and could technically run "Applying this migration" step 1 right now
— holding off because it's the only real copy of this database, with no staging duplicate to
rehearse against first, and that's exactly the kind of live/hard-to-reverse change to confirm
before running rather than after.
