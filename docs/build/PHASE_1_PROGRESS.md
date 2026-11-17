# Phase 1 Progress

Working log of Phase 1 execution against `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`
("Phase 1 — Security & Data Protection", 9 features, 156h). Mirrors
`docs/build/PHASE_0_PROGRESS.md`'s convention — update this as status changes.

## Status as of 2026-11-05 (updated — migrations applied)

**Phase 1 is in progress, not complete.** 8 of 9 features now have real, shipped, DB-verified
work; 1 was already satisfied by the existing schema. The remaining gap is entirely inside Row-
Level Access Rules (see "Open" below) — don't read "8 done" as "Phase 1 done."

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

### Open

**Row-Level Access Rules (RLS) — partially done.** The DB side is live and verified (see Decision
row above). What's still open:

- **Rewired:** `src/lib/actions/auth.ts`'s `learnerProfile.create` (signup) now goes through
  `withRlsContext` — one call site, low risk, typechecked.
- **Deliberately not rewired this pass:** `src/lib/actions/wioa.ts` (~12 functions) and
  `src/lib/data/wioa.ts` (11 page call sites). Reasoning: this is the most heavily-tested module in
  the app (real manual QA behind it per `docs/build/WIOA_BUILD_WORKFLOW.md`), several of its
  functions read a row *before* establishing role-based access (fetch the document, then check
  case ownership) — switching those onto the RLS client changes the order role/session context
  needs to be known, which risks subtly changing behavior (e.g. a Partner Staff hitting an
  unassigned case would get "not found" instead of today's explicit "Not your assigned case").
  There's no Docker/Playwright available in this sandbox to catch a regression here, and this
  module handles real government funding data for a real program — that combination is exactly
  where a rushed rewrite does more harm than leaving it until it can be done with test coverage.
- **To finish this safely:** rewire `wioa.ts` function by function (not all at once) with the
  Vitest/Playwright suite running against a real Postgres (`docker-compose.test.yml`) after each
  one, in an environment where Docker is actually available.

### Resolved — migrations applied 2026-11-05

Both previously-blocked migrations were applied via `npx prisma migrate deploy` once explicitly
requested, and verified directly against the live DB (not just by inspecting the SQL):

- `Pathway`/`AuditLog`/`RateLimitBucket` tables confirmed present; every `Course` row has a
  non-null `pathwayId`.
- The No-SSN constraints actually reject bad input — tested live: an `EvidenceSubmission` insert
  with an SSN-shaped string in `description` fails with
  `violates check constraint "EvidenceSubmission_no_ssn_description"` (tested inside a
  transaction, then rolled back).

Nothing left blocked on the DB side. The only remaining gap in Phase 1 is the RLS call-site
rewiring below.
