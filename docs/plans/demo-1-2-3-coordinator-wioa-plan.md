# DEMO-1 / DEMO-2 / DEMO-3 — Coordinator WIOA case screen: plan

**Status:** Ticket A built and merged (PR #37, `0233313`, merge commit `10e3274`); QC in progress.
Ticket B blocked — see §4.
**Register:** `docs/plans/demo-feedback-2026-11-27.md` (client demo, 2026-11-27).
**Owner split:** lead session plans and QCs; an executor builds. The lead does not build; the
executor does not accept its own work (`docs/DEV-APPROACH.md`).

**Session model for the DEMO track — decided 2026-11-27 (Sadin).** The two-session split
**stays in force for DEMO work.** Commit `f6c9d12` recorded the lead/QC session closing, but its
wording scopes that to the NOTIF/CAP plan and says nothing about DEMO; this entry resolves the
ambiguity rather than leaving it to be re-guessed. The reason the split is kept here is
throughput: the executor runs Ticket A's verification while the lead starts Ticket B's design,
instead of the two running in series. QC judgement stays with the lead either way — an executor
accepting its own build is the one thing the split exists to prevent.
**Out of scope for this plan and this executor:** the Phase 6 notifications foundation and WIOA
upload-cap track (`docs/plans/notifications-and-upload-cap-kickoff.md`) — different lead, executor
mid-build, separate worktree at `../nfcap_lms-wt-notif`. Do not touch it.

---

## 1. The problem

**The funding half of the WIOA module was never connected to any screen.** Verified against
`stage` (the branch the demo was run from) on 2026-11-27.

`advanceWioaFundingStatus` (`src/lib/actions/wioa.ts:630`) is the only function that advances a
course funding case. It is correct: it validates the transition, writes `WioaCourseCase.status`,
appends `WioaFundingStatusHistory`, creates the `CourseUnlock` at `TUITION_APPROVED`, optionally
creates a FOLLOWUP appointment, and writes an audit event.

**It has no caller outside `tests/unit/wioa-status.test.ts`.** Consequences, in order:

1. A learner requests funding → `WioaCourseCase` is created at `ETPL_TRAINING_REQUESTED`. Correct.
2. No screen in any role can move it off that status.
3. `TUITION_APPROVED` is therefore unreachable → **`CourseUnlock` never fires → no course is ever
   unlocked through WIOA funding.** That is the module's entire purpose.
4. The learner's funding timeline is permanently stuck on step 1 of 5.

What the coordinator *does* see is `FundingCard` (`src/components/wioa/WioaCaseDetailView.tsx:667`),
a 12-field form saved by `updateWioaFunding` (`src/lib/actions/wioa.ts:774`). That action writes
`EtplFundingRequest` and `FundingAuthorization` only — it never touches `WioaCourseCase.status` and
never appends funding history. Saving succeeds, shows "Funding details saved", and moves nothing.

**So there are two parallel representations of funding progress: the 5-state enum that drives
everything and is unreachable, and a 12-field form that is editable and inert.** That is both the
"doesn't work end to end" defect and the main reason the screen cannot be read.

### What is *not* broken (checked, so the fix stays narrow)

- **The data model.** The master-case / course-case split models the two pipelines correctly.
- **The learner side.** `requestCourseFunding` (`src/lib/actions/wioa.ts:242`) creates one case per
  course, dedupes open requests, and `FundingView` renders an independent timeline per request. The
  id/slug plumbing is consistent end to end (`AdminCourse.id` is the slug, and
  `WioaCourseFundingRecord.courseId` is mapped to the slug too) — **do not "fix" this**, see
  `CLAUDE.local.md` on PR #24.
- **The eligibility pipeline.** It has a working advance control and runs end to end.

### Secondary defects in the same area

| # | Defect | Evidence |
| --- | --- | --- |
| S1 | Staff can only ever reach course case #1 | `WioaCaseDetailView.tsx:713` — `wioaCase.fundingRequests?.[0]?.id` |
| S2 | `updateWioaFunding` revalidates a path that does not exist | `wioa.ts:834` revalidates `/coordinator/${courseCaseId}`; that route is keyed by **master** case id |
| S3 | No DB-level guard on duplicate open course cases | `WioaCourseCase` has no unique constraint; the action guards in code only |
| S4 | Case header asserts a single course title | `WioaCaseDetailView.tsx:150` prints `wioaCase.courseTitle`, the back-compat first-course value (`src/lib/data/wioa.ts:505-509`) — false as soon as there are two courses |

### Why the working half still reads as confusing (DEMO-1)

1. **14 eligibility statuses are rendered as 2 badges.** `WIOA_UI_PHASES` already groups them into
   4 phases (`src/lib/wioa/status.ts:5`) and the UI barely uses it. Nothing shows what came before,
   what comes next, or how far along the case is.
2. **The primary action is behind a tab named "Status history."** `StatusCard` renders at
   `WioaCaseDetailView.tsx:377`, inside `tab === 'history'`. Advancing a case is the coordinator's
   job; it is filed under a read-only log.
3. **The summary paragraph restates the badges** in prose, in the most valuable space on the page.
4. **"Case details" mixes identity with course facts**, including the back-compat course title.
5. **The right rail is three unrelated widgets** with no relationship to case progress.

Underlying cause: **the data is a pipeline; the UI is a pile of cards.**

---

## 2. Approach

**Chosen: one design covering both pipelines, built as two tickets against that single design.**

Both pipelines get the same step treatment, so they read as two siblings — which is what makes
"these are two separate tracks" (DEMO-2) obvious without explanatory copy. The funding advance
control is designed into its final position now, so it is built once.

Rejected, with reasons:

| | Approach | Rejected because |
| --- | --- | --- |
| A | Repair in place — add a funding control to the existing cards, keep the layout | Leaves 14 statuses as two badges and the action in the history tab; does not answer the client's complaint |
| C | Split routes — master case page, each course case its own page | Largest surface (new routes, new RLS paths), and makes "where is this person overall" harder, which is the coordinator's primary question |

**Assumption stated explicitly, since it was not confirmed before writing:** this plan assumes the
structure may change (the three-tab layout is not fixed). If the decision comes back as "re-layout
within the existing tabs only," Ticket B changes substantially; **Ticket A does not** — build it
either way.

**Reference material not yet supplied:** Salesforce UI references were promised for the design
step and have not arrived. Ticket B's board amendment should not be finalised without them.
Ticket A does not depend on them.

**Sequencing rationale:** Ticket A is separable and carries all the real risk (server actions,
course unlock, RLS). Ticket B is presentation and cannot break funding. If work stops after A, the
module works end to end — the client's stated priority.

---

## 3. Ticket A — make the funding pipeline work (DEMO-3 + S1–S4)

**Branch:** `feature/DEMO-3-funding-pipeline-wiring` · **PR → `stage`** · Label `found-by-client`.
**This is the client's priority. It can ship without Ticket B.**

### A1. Convert `advanceWioaFundingStatus` to the result contract

`src/lib/actions/wioa.ts:630` currently returns `Promise<void>` and signals failure by `throw`. It
must return `WioaActionResult` (`{ ok: true } | { ok: false; error: string }`) for **expected**
failures — the invalid-transition check and the SSN-in-notes check.

This is not optional tidying. `/coordinator/[caseId]` is the exact page from `CLAUDE.local.md` #11:
its component tree shape varies with case data, so under `cacheComponents` a thrown action error is
swallowed and surfaces as `Minified React error #441` with no usable message. `advanceWioaEligibility
Status` and `updateWioaFunding` were already converted for this reason; see CLAUDE.md's "Error
handling convention".

Keep `throw` only for `requireCourseCaseAccess` (access control, runs before the conditional
rendering is reached). Update `tests/unit/wioa-status.test.ts:136-180`, which currently asserts
throw-based behaviour.

### A2. Build the funding advance control, per course case

A control that calls `advanceWioaFundingStatus(courseCaseId, nextStatus, appointment?)`, with next
statuses from `nextFundingStatusOptions(current.status)` — never a free list of all five.

- One control **per course case**, not one for the case detail page.
- Optional FOLLOWUP appointment fields, mirroring `StatusCard`'s appointment handling.
- Errors shown inline from `result.ok === false`, not via try/catch.
- **Coordinator only.** Partner Staff's fetch deliberately omits funding data so it never reaches
  that role's client bundle (`src/lib/data/wioa.ts:501-503`) — do not change that.

### A3. Remove the first-course pinning (S1)

Delete `const courseCaseId = wioaCase.fundingRequests?.[0]?.id;` (`WioaCaseDetailView.tsx:713`).
Render one funding section per entry in `wioaCase.fundingRequests`, each carrying its own course
title, status, step display and advance control. Empty state when the array is empty; the data
layer already returns the full array.

### A4. Resolve the dual representation

**The 5-state `WioaFundingStatus` enum is the pipeline.** It drives `CourseUnlock`, the learner's
timeline and reporting. The `EtplFundingRequest` / `FundingAuthorization` fields become
**attributes recorded against the step they belong to**, not a flat 12-field form saved in one go.

Minimum for this ticket: the fields stay editable and keep saving through `updateWioaFunding`, but
they are presented under their step, and the step itself is advanced by A2's control — so it is
visually unambiguous which control moves the case. Do **not** silently derive the enum from the
fields, and do **not** delete fields; both are product decisions, not an executor's call.

### A5. Fix the revalidation bug (S2)

`wioa.ts:834` revalidates `/coordinator/${courseCaseId}` — a path that does not exist, since
`/coordinator/[caseId]` takes the **master** case id. Look up `masterCaseId` (the course case is
already loaded) and revalidate that path. `advanceWioaFundingStatus` already revalidates
`/coordinator`, `/partner` and `/learner/funding` correctly — match that.

### A6. Database guard on duplicate open course cases (S3)

**Do not add a plain `@@unique([masterCaseId, courseId])`.** A learner may legitimately re-request
funding for a course after a previous case closed (`FUNDING_DECLINED`), and a plain constraint
would block that — the action's own guard is `findFirst({ where: { ..., closedAt: null } })`.

Use a **partial unique index** on `(masterCaseId, courseId) WHERE "closedAt" IS NULL`. Prisma has
no schema syntax for this, so it is a hand-written SQL migration with the index also declared to
Prisma as an unmanaged index comment, or left out of the schema with a comment pointing at the
migration — the executor should state which it chose in the handoff.

**Hard stop (`CLAUDE.local.md` #8):** apply the migration before any code depends on it. Run
`npm run db:status`, then `npm run db:deploy`. A generated-but-unapplied migration is what shipped a
live "Something went wrong" last time. `tsc`, `eslint` and `next build` will all stay green through
that mistake — none of them touch the database. Restart the dev server after any `prisma generate`
(`CLAUDE.local.md` #3).

### A7. Header correctness (S4)

Stop printing `wioaCase.courseTitle` as a badge beside the eligibility phase. The header is about
the **learner and their eligibility case**; courses belong to the funding section. Leave the
back-compat fields on the type (other call sites may still read them) but stop using them here.

### Acceptance criteria — Ticket A

Verified **in a browser, driving the real controls**, not by direct URL navigation
(`CLAUDE.local.md` #10, and the `agent-browser` section of CLAUDE.md):

1. A coordinator can move a funding case through every step of
   `WIOA_FUNDING_STATUS_ORDER` using on-screen controls only.
2. Reaching `TUITION_APPROVED` creates a `CourseUnlock` and the learner can open the course.
   **Confirm the learner can actually reach the course**, not just that a row exists —
   `CLAUDE.local.md` #9 is exactly this trap.
3. A learner with **two** funding requests shows **two** funding sections to the coordinator, each
   independently advanceable, with the correct course on each.
4. An invalid transition shows its real message inline — **not** `Minified React error #441`.
   Confirm in a production build (`npm run build && npx next start`); `next dev` does not minify and
   will not reproduce it. Stop the dev server first (`CLAUDE.local.md` #2).
5. The learner's `/learner/funding` timeline reflects each staff advance.
6. Partner Staff still sees no funding data (check the payload, not just the screen).
7. `npm run lint`, `npm run build`, `npm test` pass. E2E where Docker is available.

---

## 4. Ticket B — make the screen readable (DEMO-1 + DEMO-2)

**Branch:** `feature/DEMO-1-coordinator-case-clarity` · **Depends on Ticket A being merged.**
**Blocked until:** the Salesforce references arrive, the scope decision in §2 is confirmed, and the
`CRD` board amendment is approved and recorded in `docs/MOCKUP-INDEX.md` (`docs/DEV-APPROACH.md` —
a change to an approved board needs a new approval). **Do not start B from this document alone.**

Intended scope, to be fixed by the board amendment:

1. **Eligibility as a step path** across its 4 phases, current position obvious, using the existing
   `WIOA_ELIGIBILITY_STATUS_PHASE` map rather than a new one.
2. **Each funding case as its own step path**, visually a sibling of the eligibility path — this is
   what makes DEMO-2's "two separate tracks" self-evident.
3. **The advance control moves out of the Status history tab** to sit with the pipeline it drives.
4. **Header and summary rewritten** — no prose restating badges; no course title in the header.
5. **Right rail reconsidered** — board contact, appointment and communications earn their place
   against case progress or move.

---

## 5. Open questions

| # | Question | Blocks | Who decides |
| --- | --- | --- | --- |
| Q1 | Does the coordinator **record** a tuition decision made by the workforce board, or **make** it in-app? If they make it, the funding control needs approval semantics and an audit trail beyond the existing audit event. | Ticket A's final shape; A can be built as record-keeping and revisited | NFCAP |
| Q2 | Structure may change, or re-layout within the current tabs only? | Ticket B only | Manjila / Sadin |
| Q3 | Salesforce references for the parent-record-plus-child-pipelines pattern | Ticket B only | Manjila |
| Q4 | Do the 12 ETPL/authorization fields all still earn their place, or does some of it become derived? | A full resolution of A4; A's minimum does not need it | NFCAP |

Q1 and Q4 are product questions. The executor must not resolve either by choosing in code.

---

## 6. Standing constraints for the executor

- **Never `git checkout`, `git stash`, or delete a branch in the main checkout.** Several sessions
  share it; a checkout silently carries another session's work onto the wrong branch when files are
  byte-identical. Read other branches with `git show <ref>:<path>`; use `git worktree add` if one
  genuinely needs checking out. CLAUDE.md, "Known environment issues".
- **Never add `export const dynamic = 'force-dynamic'`.** Every new route segment gets a
  `loading.tsx`. CLAUDE.md, "Performance conventions".
- **Nothing inside `$transaction` but database writes** — no uploads, no fetches.
- **Expected failures return, unexpected ones throw.** CLAUDE.md, "Error handling convention".
- **End the handoff with a "Not verified" list.** `docs/DEV-APPROACH.md`.

---

## 7. QC log — Ticket A (lead session, 2026-11-27)

**Static review: complete. Runtime criteria 1–5: delegated to an executor, not yet reported.**

### Verified

- **A1** — `advanceWioaFundingStatus` returns `WioaActionResult`. The blanket `catch` around the
  whole `withRlsContext` call converts *any* error, not just expected ones, into an inline
  message. Checked against `advanceWioaEligibilityStatus` before reporting it: that function does
  exactly the same thing, so this is the codebase's established post-`CLAUDE.local.md`-#11 pattern,
  **not a Ticket A regression**. Worth revisiting as a convention, separately, for all three.
- **A3** — the `fundingRequests?.[0]` pinning is gone; one `FundingSection` per entry.
- **A5** — `updateWioaFunding` now looks up `masterCaseId` and revalidates the real route.
- **A6** — a genuine partial unique index `WHERE "closedAt" IS NULL`, correctly reasoned in both
  the migration and the schema comment, and **applied to the database**: `npm run db:status`
  reports "Database schema is up to date!" `CLAUDE.local.md` #8 was avoided.
- **Criterion 6 (structural)** — `courseTitle`, `funding` and `fundingRequests` are all gated on
  `opts?.includeFunding` (`src/lib/data/wioa.ts:598-601`), so Partner Staff's fetch yields
  `null`/absent. Payload still to be confirmed at runtime.
- **Criterion 7** — CI green on PR #37 (Build, Test). Local production build clean, TypeScript
  clean. Local unit tests cannot run in this sandbox: no Docker, as CLAUDE.md warns.

### Findings

| # | Finding | Evidence | Disposition |
| --- | --- | --- | --- |
| Q-1 | **A7 is incomplete.** The header badge was removed, but the back-compat first-course `courseTitle` is still rendered as "Course / pathway" in Case details — so a two-course learner is silently described by their first course only. S4 was moved, not fixed. | `WioaCaseDetailView.tsx:211`, populated at `src/lib/data/wioa.ts:599` as `courseCases[0]?.course.title` | **Fold into Ticket B**, which rewrites this header anyway (§4.4). Not a merge-blocker. |
| Q-2 | **A declined funding request displays as "Step 5 of 5"** — the furthest-along position in the pipeline, past `APPRENTICESHIP_ENROLLMENT_COMPLETE` at "Step 4 of 5". `WIOA_FUNDING_STATUS_ORDER` is an enum listing in which `FUNDING_DECLINED` happens to sit last; the step indicator treats it as a sequence. | `WioaCaseDetailView.tsx` `FundingAdvanceControl`, `stepIndex` off `WIOA_FUNDING_STATUS_ORDER.indexOf`; order at `src/lib/wioa/status.ts:102` | **Ticket B**, as part of the step-path design (§4.2). A failure branch must not render as the final step. |
| Q-3 | **Acceptance criterion 1 is unsatisfiable as written** — "every step of `WIOA_FUNDING_STATUS_ORDER`" cannot be traversed, because `FUNDING_DECLINED` is a terminal *branch* and both terminals return `[]` from `nextFundingStatusOptions`. The criterion is wrong, not the build. | `src/lib/wioa/status.ts:126-134` | **Criterion reworded below.** |

**Criterion 1, corrected:** a coordinator can move a funding case along the linear path
`ETPL_TRAINING_REQUESTED → TRAINING_AUTHORIZATION_PENDING → TUITION_APPROVED →
APPRENTICESHIP_ENROLLMENT_COMPLETE` using on-screen controls only, and can separately take a
non-terminal case to `FUNDING_DECLINED` as a branch.

**Note for criterion 4:** the select only ever offers valid options, so an invalid transition
cannot be produced by ordinary clicking. The realistic repro — and a real user scenario — is a
**stale page**: open the case in two tabs, advance in one, submit the now-stale option in the
other.

**Fidelity caveat:** verification runs on `npx next start`, which warns it "does not work with
`output: standalone`" — the deploy runs the standalone server instead. Same build output, so
minification and `cacheComponents` behaviour hold, but it is not byte-for-byte the deployed
serving path.
