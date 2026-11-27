# WIOA module — spec alignment kickoff

## Status as of 2026-11-25 (same-day follow-up session)

**6 of 7 gaps closed. Only #6 remains, deliberately paused on a product decision.** **Merged to
`stage` 2026-11-25** via PR #29 (`feature/phase5-funding-productisation`, commit `2c2abb7`, merge
commit `65e11ca2`) — this section previously said "nothing is committed or pushed yet," written in
the same commit that merged it; corrected 2026-11-27 during a doc-reconciliation pass. Everything
below was verified by building, `tsc`/`eslint`, and live `agent-browser` walkthroughs as
Learner/Coordinator/Partner Staff before that merge.

- **#1 (case structure) — fully resolved**, not just planned. Two migrations applied to staging
  and verified against real data:
  1. `20261125100000_split_wioa_case_master_and_course` — first pass, pulled board/AJCC/contact/
     Partner-Staff-assignment up to a new per-learner master `WioaCase`; renamed the old per-course
     table to `WioaCourseCase`.
  2. `20261125120000_split_wioa_eligibility_and_funding` — the real fix: moved the eligibility
     pipeline (spec Section 7 steps 1-13), the document checklist, and orientation/intake
     appointments onto the master case too, since eligibility is one-time-per-student, not
     per-course. `WioaCourseCase` shrunk to just the funding pipeline (`WioaFundingStatus`:
     `ETPL_TRAINING_REQUESTED` → `TRAINING_AUTHORIZATION_PENDING` → `TUITION_APPROVED` →
     `APPRENTICESHIP_ENROLLMENT_COMPLETE`/`FUNDING_DECLINED`), only reachable once the master is
     `WIOA_ELIGIBLE`. The live data's real duplicate-eligibility problem (one learner with two
     course-cases, one a complete real eligibility record, one a redundant partial duplicate) was
     consolidated correctly by the migration's generic "furthest-progressed course-case is
     canonical" logic — verified by direct query before and after.
  - RLS redesigned around the split (`app_can_access_case` retargeted through `WioaCourseCase` ->
    `WioaCase`; new `app_can_access_master_case`); every policy swap ordered before its column
    drop (a first-attempt migration failed exactly here — `cannot drop column ... policy ...
    depends on it` — and was cleanly rolled back and fixed before reapplying).
  - Every consumer rewritten: `src/lib/actions/wioa.ts`, `src/lib/data/wioa.ts`,
    `src/lib/wioa/status.ts` (split into `WIOA_ELIGIBILITY_STATUS_*`/`WIOA_FUNDING_STATUS_*`, with
    back-compat aliases for UI call sites not yet redesigned), `wioa-boards.ts`, `stalledCases.ts`,
    `search.ts`, `data-io.ts`, `retention.ts`, both seed/QC scripts, both WIOA test files, and
    every WIOA UI component. New actions: `requestCourseFunding` (course-less eligibility, pick a
    course only once eligible — a real flow change, not just data plumbing),
    `advanceWioaEligibilityStatus` + `advanceWioaFundingStatus` (split from the old
    `advanceWioaCaseStatus`). `assignWioaCasePartnerStaff` simplified to a single write on the
    master (the first migration's fan-out-to-every-course-case workaround is gone — nothing left
    to fan out to).
  - **UI**: the learner Funding page got a working (not mockup-polished) course funding-request
    picker and a per-phase funding timeline per course — both missing initially, added when
    checking Phase 5 feature #1 ("Funding Progress Transparency") against the new model exposed
    the gap. A full UX redesign of the course-less flow still needs the `DEV-APPROACH.md`
    mockup-first gate before anyone builds the polished version.
  - Live-verified end-to-end as Learner, Coordinator, and Partner Staff: eligibility timeline,
    documents, funding-request timeline, Coordinator's All Cases list/KPIs/Reports (the funding
    aggregation — the highest-risk rewrite — correctly shows $4.2k approved of $4.5k requested,
    93%, by board), Stalled Cases, case assignment (Coordinator assigns -> Partner Staff sees it
    immediately), and Partner Staff's follow-up-note action.
- **#2, #3, #4, #5, #7 — all fixed**, see each section below for what was built. #7 needed its own
  small migration (`20261125130000_wioa_communication_status`).
- **#6 — still open.** Needs the user to pick dashboard-only-with-fixes vs. real
  notifications/emails before starting (see that section).

---

Written 2026-11-25, mid-Phase-5. The user supplied
`docs/wioa/WIOA_Eligibility_Matching_App_Developer_Specification.pdf` — the formal developer spec
this module was meant to be built against — and asked whether the codebase actually aligns with
it. It hadn't been checked against this document before; `docs/wioa/WIOA_INTEGRATION_PLAN.md` was
written independently and doesn't cite it as a source. A full audit (code-level, not doc-level —
file:line evidence, not trusting comments describing the code) found one real architecture
question and six smaller, independent gaps. **User decision: fix all of it**, but update docs and
resume in a new session rather than keep building Phase 5 feature work on an architecture that may
change underneath it. Phase 5's own status is `docs/build/PHASE_5_PROGRESS.md`.

## #1 — Case structure: per-course vs. per-student (the one that needs a real plan)

**Spec** (`WIOA_Eligibility_Matching_App_Developer_Specification.pdf`, Section 11, page 7): the
suggested data model calls `wioa_cases` a **"Master student WIOA case"** — singular, one case per
student. `training_programs / etpl_programs` and `funding_requests` are separate tables the spec
lists alongside it, implying a student's one case references a training-program selection and a
funding request tied to that selection — not that the whole case gets duplicated per course.

**Built**: `WioaCase.courseId` (`prisma/schema.prisma`) is a **required** field — a new `WioaCase`
row is created per course (`sendWioaOutreach` in `src/lib/actions/wioa.ts` creates one keyed on
`learnerId + courseId`). This was a **deliberate decision**, not an oversight —
`docs/wioa/WIOA_INTEGRATION_PLAN.md:124` has the explicit inline comment `-- scoped per learner
PER COURSE (see below)`, and line 232 lists it as resolved in a review pass. That planning doc does
not cite this PDF as its source for the call.

**Why this isn't a quick fix.** Everything downstream currently assumes case-per-course:

- `EtplFundingRequest`/`FundingAuthorization` (the 8 funding milestones, `requestedAmount`
  included) are `@unique` on `wioaCaseId` — 1:1 with a case, so 1:1 with a course today.
- `CourseUnlock` — the actual mechanism that unlocks a restricted course for a learner — fires off
  *that course's case* reaching `TUITION_APPROVED` (`advanceWioaCaseStatus`,
  `src/lib/actions/wioa.ts`). A single master case needs a different answer to "which course does
  this funding unlock" — most likely a training-program/course selection living inside the funding
  request itself, not on the case.
- `WioaCommunication` (email log), `WioaDocument` (uploads), `Appointment` all hang off
  `wioaCaseId` — per-course today.
- The learner's own Funding page already depends on per-course cases: "which course are you
  seeking funding for?" shows that course's independent timeline. Verified directly this session —
  the demo learner had a fully-approved case for Tile Installation and *no case at all* for Trim
  Freshing, tracked completely independently.
- Phase 5's own reporting work (`WioaBoardPerformance`/`WioaFundingImpact`,
  `getWioaReportingSummary`) aggregates per-case, so per-course, numbers.
- `getStalledCases` (stalled-case detection) operates per case — "stalled" currently means one
  course's case hasn't moved, not a student's overall engagement.
- Live demo data already exists in the per-course shape (seeded via
  `scripts/seed-demo-learners.ts` and friends).

**What "fix it" actually requires** (not yet planned in detail — do this first, next session):
1. Decide the replacement shape: most likely `WioaCase` becomes genuinely per-student (drop the
   required `courseId`), with a `training_program`/course selection and its own funding request
   living as a child concept the case can have one-or-more of — closer to the spec's
   `funding_requests` (plural) sitting alongside a singular case.
2. Redesign `CourseUnlock`'s trigger: it needs to know *which* course a given funding
   approval covers, now that the case itself doesn't carry a single `courseId`.
3. Migration plan for live data: every existing per-course `WioaCase` needs collapsing into one
   case per student, with their course-specific funding/document/communication history
   re-attached to the new shape without data loss.
4. Re-check every consumer of `WioaCase.courseId` across data/actions/UI — this is a wide blast
   radius (reporting, stalled-case detection, the learner Funding page, Partner/Coordinator case
   lists, `CourseUnlock`).
5. This touches Phase 1–4 work already marked done/shipped, not just Phase 5 — flag that explicitly
   wherever this gets tracked (Plane, once connected, or `docs/build/PHASE_1_PROGRESS.md`'s
   RLS/case-access work, which assumes the current shape too).

## #2 — Workforce board matching has no real fallback chain [RESOLVED 2026-11-25]

`src/lib/wioa/matching.ts`'s new `matchBoardContact` does the real 3-tier walk (PRIMARY active ->
SECONDARY active -> GENERAL active), replacing the single priority-sorted `findFirst`.

**Spec** (Section 5, page 3): Contact unavailable → secondary contact; secondary unavailable →
general WIOA/AJCC intake route. A real 3-tier escalation.

**Built**: `src/lib/wioa/matching.ts:44-47` does a single `findFirst` ordered by `priority: 'asc'`
— picks one active contact and stops. The function's own comment claims "Contact precedence:
PRIMARY, falling back to SECONDARY, falling back to GENERAL," but there's no actual fallback
logic behind that claim — just a sorted lookup that happens to usually return the right one when
data is clean. If a route has no PRIMARY contact, or multiple contacts share a priority, behavior
won't match either the comment or the spec.

**Fix**: implement the real 3-step escalation (try PRIMARY active contact; if none, try SECONDARY;
if none, fall back to a GENERAL intake route) rather than one sorted query.

## #3 — No Age 18+ eligibility check [RESOLVED 2026-11-25]

`requireAge18Plus` in `src/lib/actions/wioa.ts`'s `updateWioaProfile` blocks the save outright if
the entered date of birth is under 18 — a hard block, not a soft warning (decided: letting an
under-18 profile save and only flagging it later would let the whole outreach/eligibility flow
start on a profile that can never actually qualify).

**Spec** (Section 8, page 5): "Age 18+" listed as a profile validation rule, not a document.

**Built**: `dateOfBirth` is captured and stored (`src/lib/actions/wioa.ts:56,74,87`) but never
validated against it anywhere.

**Fix**: add an actual check — where it surfaces (blocking registration vs. a soft eligibility-page
warning) is a product call, not an engineering one; flag for the user when this is picked up.

## #4 — Document upload isn't audited [RESOLVED 2026-11-25]

`uploadWioaDocument` now calls `logAuditEvent` (action `UPLOAD_WIOA_DOCUMENT`) after the upload
transaction commits. Retention-sweep deletion was already logging (`src/lib/actions/retention.ts`
— confirmed, not re-added).

**Spec** (Section 10, page 7): audit logs required for view, download, upload, verification, and
deletion of sensitive documents.

**Built**: view (`src/lib/actions/wioa.ts:335`) and review/verify (`:417`) call `logAuditEvent`.
**Upload does not** — `uploadWioaDocument` has no audit-log call. Deletion (the retention sweep)
wasn't confirmed either way in the audit pass and should be re-checked.

**Fix**: add `logAuditEvent` to `uploadWioaDocument`, and confirm/add it to the retention deletion
path.

## #5 — Stale-contact flagging doesn't exist [RESOLVED 2026-11-25]

`lastVerifiedDate` is now surfaced on the Admin board-detail contacts list
(`BoardDetailView.tsx`): a "Last verified <date>" / "Never verified" line, plus a "Stale" badge via
`isContactStale` past 180 days (prototype default, same status as the 14-day stalled-case
threshold — not client-confirmed, just reasonable until they weigh in).

**Spec** (Section 17, page 10): "Track 'last verified' date and flag stale contacts for review."

**Built**: `lastVerifiedDate` is written at seed time (`prisma/seed-wioa.ts:132`) and then **never
read anywhere** in `src/` — stored, never surfaced.

**Fix**: surface it in the admin boards/contacts UI (e.g. a badge/warning past some staleness
threshold — threshold itself is a product question, not a guess).

## #6 — Automation triggers are dashboard-only, and one is missing [STILL OPEN]

**Spec** (Section 18, page 10): 5 triggers, each with a "suggested action" implying the system
does something, not just displays something.

**Built** (`getWioaReportingSummary`'s `followUpQueue`, `src/lib/data/wioa.ts`): 4 of 5 exist —
document rejected, no-response after initial email (implemented as 3+ **calendar** days, spec
says **business** days), documents pending 5+ days, WIOA-eligible-but-funding-not-started. All four
are passive dashboard-list entries a human has to look at; none auto-sends a notification or
email. **"Upcoming appointment reminder" is entirely missing** — no matching logic anywhere.

**Fix, scope depends on a product decision**: closer to spec as a dashboard-only system just needs
the missing appointment-reminder trigger added and the calendar/business-day distinction fixed;
closer to spec as written (an actual "suggested action") means wiring real
notifications/emails off these triggers — a materially bigger lift. Flag for the user before
picking a direction.

## #7 — Email failures vanish instead of being logged with a failed status [RESOLVED 2026-11-25]

Migration `20261125130000_wioa_communication_status` added `WioaCommunication.status`
(`CommunicationStatus`: `SENT`/`FAILED`, default `SENT`) and `failureReason` (text). Both
`sendWioaOutreach` and `sendWioaCaseReminder` now wrap the `sendEmail` call in try/catch, write a
`FAILED` row with the caught error on failure (instead of writing nothing), and rethrow so the
caller still sees the error. The learner's own Outreach log (`FundingView.tsx`) shows a red
"Failed" badge instead of always "Sent".

**Spec** (Section 19, page 11): "Every outgoing email must be logged with recipient, timestamp,
and status."

**Built**: `WioaCommunication` (`prisma/schema.prisma:520-539`) has **no status field at all** —
this was never built, independent of anything from this session. Compounding it: this session's
own Phase 5 #3 fix (`sendWioaOutreach`/`sendWioaCaseReminder` in `src/lib/actions/wioa.ts`) made
these functions only write the communication row **after** a successful send, so a failed send now
produces **zero record** — not even a failed one. Before this session's change, at least a (dishonest)
"sent" row always got written; now a failure disappears entirely from the log.

**Fix**: add a `status` enum/field to `WioaCommunication` (e.g. `SENT`/`FAILED`), and write a row
on both outcomes in both functions. Small, same migration pattern as Phase 5 #5's
`requestedAmount` column — straightforward once picked up.

## #8 — User roles — confirmed matching, no action needed

Spec's 4 roles (Student, Partner Staff, WIOA Coordinator, Administrator) map exactly to
`LEARNER | PARTNER_STAFF | WIOA_COORDINATOR | ADMIN` (`src/lib/roles.ts:7,9`). No gap. (Prisma's
own `UserRole` enum in `schema.prisma` only has `LEARNER`/`ADMIN` — the other two roles live in
Supabase Auth metadata, not that enum. Not drift, just a different source of truth — noted so it
isn't mistaken for one later.)

## What's actually left

1. **#6** — needs a product decision (dashboard-only-with-fixes vs. real notifications/emails)
   before any code.
2. **#6 aside, nothing else from this doc is blocking.** See `docs/build/PHASE_5_PROGRESS.md` for
   Phase 5's own remaining item (Document Upload Limits — the 10-upload cap logic exists and is
   unchanged by today's rewrite, but was never exercised with 10 real uploads).
3. **Corrected 2026-11-27:** everything in this doc (the #1 architecture split and gaps #2-5/#7)
   merged to `stage` 2026-11-25 via PR #29 — see the Status section above. This doc previously said
   it was still uncommitted; that line was written in the same commit that merged it and was never
   updated afterward.

## Resume prompt for the next session

**Superseded 2026-11-27 — #1 and gaps #2-5/#7 already merged to `stage` via PR #29 (2026-11-25,
commit `2c2abb7`).** The prompt below was written before that merge and still describes the work as
uncommitted; kept for history, but start from gap #6 directly instead of re-verifying what's
already on `stage`.

```
Resume: NFCAP LMS — WIOA spec alignment, gap #6 (automation triggers)

Repo: c:\Users\sthas\Projects\nfcap_lms. Base branch: stage. Read CLAUDE.md and CLAUDE.local.md
first.

Context: docs/plans/wioa-spec-alignment-kickoff.md has the full history. 6 of 7 spec-alignment gaps
are resolved and merged to stage (PR #29, 2026-11-25), including #1 (the full per-course ->
master+funding case-structure split — schema, migrations, RLS, every consumer, and live-verified UI
across Learner/Coordinator/Partner Staff roles). Only #6 (automation triggers) remains, deliberately
paused on a product decision: dashboard-only (fix the missing appointment-reminder trigger + the
calendar-vs-business-day bug) vs. real notifications/emails off the 5 triggers (materially bigger
lift). Ask before picking a direction.

Process: same as every prior phase — confirm with the user before merging, UI-verify before
merge, CI green is not approval by itself. Nothing gets pushed without explicit go-ahead.
```
