# WIOA Funding Module — Build Workflow

Phase-wise build plan for the WIOA module. Companion to `docs/wioa/WIOA_INTEGRATION_PLAN.md`
(source of truth for the module's shape/decisions — this doc is sequencing/scope for
implementation only, same convention as `docs/build/BUILD_WORKFLOW.md` for the core LMS).

Working mode per phase: **DECIDE → BUILD → REVIEW → REFINE**. Do not reopen anything
`../wioa/WIOA_INTEGRATION_PLAN.md` already resolved. Where that plan left something open, this doc
closes it below (Section "Open decisions — closed here") so each phase has no ambiguity left
to make up mid-build.

Base state this builds on: the core LMS is fully migrated to Supabase (Postgres via Prisma) +
Supabase Auth, 2 roles (`LEARNER`/`ADMIN`), per `docs/build/BUILD_WORKFLOW.md` Phases 0–6 — see
that doc and the Supabase-migration project memory. WIOA is **additive** on top of that, not a
rework.

Status legend: ✅ done · 🔲 not started

---

## Open decisions — closed here

`../wioa/WIOA_INTEGRATION_PLAN.md` Section 9 left several items open. Closing them now, using that
plan's own proposed defaults where it offered one, so no phase below has to improvise:

- **Matching precedence & no-match path.** ZIP is the only lookup key for the prototype (no
  city/county fallback — not worth building for ~10–20 seeded ZIPs). `effectiveDate` on
  `WorkforceJurisdiction` is captured but not enforced as temporal versioning (no
  "as of" query logic) — just a plain field for now. No-match path: the `WioaCase` still opens,
  with `workforceBoardId`/`ajccCenterId`/`contactId` left null and a distinct case status
  meaning "needs manual matching" (folded into status #1/#2 territory — see Phase 2) so an
  Admin can resolve it by hand from the WIOA Cases dashboard.
- **Where the new roles live.** New route namespaces: `/partner/*` (`PARTNER_STAFF`) and
  `/coordinator/*` (`WIOA_COORDINATOR`), sibling to `/admin` and `/learner`. `src/proxy.ts`'s
  `ROLE_HOME` map and role-confinement checks (currently two hardcoded `if` blocks, see
  Section "Conflicts" below) get generalized to a role→prefix table so adding these two roles
  doesn't mean copy-pasting more `if`s. `src/lib/actions/guard.ts` gains `requirePartnerStaff`
  and `requireCoordinator`, same shape as `requireAdmin`.
- **`fundingSource` enum, closed.** Two values only: `SELF_PAY` | `WIOA_PENDING`. No third
  value — the plan never needed one, it just wrote "etc." to leave room. Default at
  registration: `SELF_PAY` unless the student explicitly opts into `WIOA_PENDING`.
- **Email template ownership in Phase 1.** Admin-managed templates are Section 11 deferred
  work, not built here. Interim: one hardcoded template (subject + body) in code, sender
  identity is a fixed placeholder (e.g. `wioa@nfcap.local`, never actually dispatched — see
  Phase 1 for the log-only send). Student **can** edit the body before confirming send — this
  is the one interactive step in an otherwise scripted flow, and it's what makes "review & send"
  a real action instead of a formality.
- **18 statuses → 6 UI phases, and who advances them.** Enumerating the exact 18 statuses is
  content from the spec PDF, which `../wioa/WIOA_INTEGRATION_PLAN.md` deliberately doesn't reproduce
  verbatim in-doc (Section 9 flags this as still-to-list). Rather than re-deriving spec wording
  here, Phase 2 below defines the 18 as a Prisma enum directly and treats that enum — not this
  doc — as the canonical list, grouped into the 6 UI phases the integration plan already names
  (Registration → Matching → Contact → Eligibility Process → Funding Request → Enrollment).
  Every transition is **staff-driven** (Coordinator for any case, Partner Staff only for their
  assigned cases) — the learner never self-advances a status, they only upload documents and
  send outreach (which itself creates the case, the one learner-triggered transition).
  Transitions are **linear, not skippable, not reversible** for the prototype (staff picks the
  next status from a fixed list; going backward isn't exposed in the UI) except into
  `Closed / Ineligible`, which is reachable from any open status. `Appointment` is authoritative
  for schedule data; the matching case status (e.g. "Orientation Scheduled") is a derived label
  staff sets alongside creating the `Appointment` row — creating the appointment does not
  auto-advance the status, staff does both as one action in the same UI step.
- **PII posture.** Locked per the plan's own proposal: demo/seeded documents only, no real
  learner PII in this prototype. Written down here so it's an explicit constraint on Phase 2's
  seed data, not an assumption.
- **Evidence Storage question (Section 9's "Phase 2 is this project's first real file upload").**
  Decision: **do not** upgrade Practical Evidence to Supabase Storage as part of this module.
  WIOA documents get their own private bucket/prefix; `EvidenceSubmission.fileName` stays
  exactly as-is (filename-only, per the Supabase-migration memory's explicit note that this was
  the one deliberately-still-mocked piece). Keeps this module's Phase 2 from silently growing
  into an unrelated Evidence-storage migration.

---

## Conflicts with what's already built

Checked against the current codebase (post Supabase-migration). Two real conflicts with
assumptions baked into `../wioa/WIOA_INTEGRATION_PLAN.md`; both are called out at the phase that must
fix them, not silently patched here:

1. **Section 4's enforcement note is confirmed, not hypothetical.** `src/lib/actions/progress.ts`
   today has `getOrCreateEnrollment` called from all four of `enroll`, `markLessonComplete`,
   `recordQuizAttempt`, `submitEvidence` with **no access check at all** — any signed-in learner
   can call any of these four server actions directly for a `RESTRICTED` course right now, the
   restriction is UI-only (Enroll button hidden). Phase 4 below must add the `CourseUnlock` check
   inside `getOrCreateEnrollment` itself, exactly as the plan already specifies — flagged here
   only to confirm it's a real, currently-exploitable gap, not a defensive "just in case."
2. **`src/proxy.ts` is hardcoded to exactly two roles.** `ROLE_HOME` is a 2-entry map and the
   role-confinement logic is two literal `if (pathname.startsWith('/admin') && role !== 'ADMIN')`
   / `/learner` blocks — there's no generic "confine role X to prefix Y" mechanism today. Adding
   `PARTNER_STAFF`/`WIOA_COORDINATOR` **requires editing `proxy.ts`'s structure**, not just
   adding data — this is real Phase 3 work, not a config change.
3. **No `LearnerProfile` table exists.** `src/lib/data/learners.ts` reads only Supabase Auth
   (`user_metadata.name` + email) — there is no Postgres-side user table today. Phase 1 is this
   module's first departure from "Auth is the only user store." Per the integration plan Section
   5, decision: add a `LearnerProfile` Postgres table (keyed on the Supabase user id, same
   app-enforced-FK pattern `Enrollment.learnerId` already uses) rather than stuffing structured,
   queryable fields (address, ZIP, employment status) into `user_metadata` — the matching engine
   needs to query by ZIP, which `user_metadata` can't do.
4. **Everything else lines up.** `Course.access` is already a Prisma enum `CourseAccess`
   (`OPEN`/`RESTRICTED`) exactly matching Section 4's assumption — no schema change needed there,
   `CourseUnlock` is purely additive. `SignupForm.tsx` today collects only name/email/password,
   confirming Section 5's note that registration must be extended, not adjusted.

---

## Phase 1 — Match ✅

**Goal:** A student can register with an address and see who their matched workforce office is.

**Build:**

- `LearnerProfile` table (Postgres, new — see Conflict #3): `learnerId` (Supabase user id, unique),
  `streetAddress, city, state, zip, preferredLanguage, employmentStatus,
  unemploymentInsuranceStatus, trainingApprenticeshipInterest, fundingSource, dateOfBirth,
  mobilePhone`. `fundingSource` uses the closed 2-value enum (see above).
- Extend `SignupForm.tsx` + `src/lib/actions/auth.ts`'s `signup` action to collect these fields
  and create the `LearnerProfile` row alongside the Supabase Auth account. Keep the existing
  name/email/password fields as-is — additive fields only.
- `WorkforceBoard`, `AjccCenter`, `WorkforceJurisdiction`, `WorkforceContact` tables (Section 5
  shape, unchanged from the plan). Seed 10–20 sample ZIPs across a few CA counties.
- ZIP → board matching function (`src/lib/wioa/matching.ts` or similar): ZIP-only lookup (per
  the closed decision above), returns board/AJCC/contact or `null`.
- Learner-facing `Funding`/`WIOA` nav entry + landing screen: shows the matched office (name,
  phone, email, address) with **Email, Call, View Requirements** actions (spec-derived, already
  in the plan's IA). Email flow: generates the template (Phase 1 hardcoded template, see above),
  student can edit the body, confirm → **log only** (creates `WioaCommunication` row, no real
  delivery — Section 6/11).
- No-match state: a defined screen (not a dead end) — "we couldn't automatically match your
  address" with the case still opening for Admin to resolve by hand (closed decision above).
- Nav visibility: the Funding area only shows when `fundingSource === 'WIOA_PENDING'` on the
  learner's profile (Section 4's "routing/UX signal only" role for this field).

**Depends on:** Nothing WIOA-specific — depends on the existing Supabase Auth signup flow and
`Course.access` enum both already being in place, which they are.

**Explicitly NOT built yet:** `WioaCase` creation (sending the email in this phase only logs a
`WioaCommunication`, it does not yet create a case — that's Phase 2, per the plan's own
Section 8 split), document upload, any status pipeline, Partner Staff/Coordinator roles/routes.

**Completion criteria:** A new signup with a matching seeded ZIP sees their real matched office
and can review/send a (logged, not delivered) outreach email. A signup with a non-matching ZIP
sees the no-match screen instead of an error or a blank state.

---

## Phase 2 — Case + Documents ✅

**Goal:** Sending outreach creates a real case; a student can upload documents and staff can
review them.

**Build:**

- `WioaCase` (per learner **per course** — plan Section 5), `WioaStatusHistory`,
  `WioaCaseStatus` Prisma enum with all **18** values (the canonical list — see "Open decisions"
  above), `Appointment` (type ORIENTATION/INTAKE/FOLLOWUP).
- Wire Phase 1's "confirm send" action to **create the `WioaCase`** (status → first status in
  the pipeline) instead of only logging the communication, closing the loop the plan describes
  in Section 3's Flow B.
- `WioaDocumentRequirement` (admin-configurable, scoped per `workforceBoardId`) +
  `WioaDocument` (status: MISSING/UPLOADED/UNDER_REVIEW/ACCEPTED/REJECTED/NA). Seed a
  reasonable CA-only requirement set (identity doc, SSN card, EDD letter conditional on
  `unemploymentInsuranceStatus`, CalJOBS account) directly from `WorkforceBoard` seed data —
  no admin UI for this yet, that's Phase 3.
- Upload UI reusing Supabase Storage, **private bucket**, separate from the Evidence path (see
  "Evidence Storage question" above — Evidence itself is not touched).
- Staff accept/reject UI mirroring the existing Evidence-review pattern
  (`LearnerProfileView.tsx`'s approve/reject shape), pointed at `WioaDocument` instead of
  `EvidenceSubmission`. No real role gating yet in this phase (Coordinator/Partner Staff routes
  land in Phase 3) — build the review UI under `/admin` for now as a stepping stone, move it in
  Phase 3 once the role split exists. Flag this explicitly as temporary placement, not a design
  decision.
- Learner-facing consolidated activity feed (Section 7): outreach log, appointments, document
  status, next-step guidance — one read-only screen over the tables above.
- Seed data is demo/fabricated only — no real PII (closed decision above).

**Depends on:** Phase 1 (`WorkforceBoard`/`AjccCenter`/`WorkforceContact` must exist; a case
needs a matched board to reference, though the no-match path still opens a case with those
fields null).

**Explicitly NOT built yet:** `PARTNER_STAFF`/`WIOA_COORDINATOR` roles and their real dashboards
(Phase 3), `EtplFundingRequest`/`FundingAuthorization`/`CourseUnlock`/gating (Phase 4).

**Completion criteria:** Sending outreach from Phase 1 creates a real `WioaCase`; a learner can
upload a document for each requirement and see its status change when an Admin
accepts/rejects it, with every status transition logged to `WioaStatusHistory`.

---

## Phase 3 — Dashboards & Roles ✅

**Goal:** Real role-scoped views replace the Phase 2 admin stopgap; Admin can manage board data.

**Build:**

- `PARTNER_STAFF` and `WIOA_COORDINATOR` added to the role mechanism (`app_metadata.role`),
  promoted the same way `scripts/promote-admin.ts` promotes Admin — generalize it into one
  `scripts/promote-role.ts <email> <role>` rather than adding a second near-duplicate script.
- **`proxy.ts` restructured** (Conflict #2, real work, not optional): `ROLE_HOME` and the
  route-confinement checks become a generic role→prefix table covering all four roles
  (`ADMIN → /admin`, `LEARNER → /learner`, `PARTNER_STAFF → /partner`,
  `WIOA_COORDINATOR → /coordinator`) instead of the current two hardcoded `if` blocks.
- `guard.ts` gains `requirePartnerStaff()` / `requireCoordinator()`, same shape as
  `requireAdmin()`.
- `WioaCase.assignedPartnerStaffId` (already in the plan's schema) — Admin/Coordinator assigns
  cases to Partner Staff from the new WIOA Cases dashboard; this field is what makes
  `PARTNER_STAFF`'s "assigned students only" scoping real (plan Section 5).
- `/coordinator` dashboard: all cases, pipeline view, filters, follow-up queue (mirrors
  `/admin/learners`'s pattern) — **includes** funding visibility once Phase 4 exists.
- `/partner` dashboard: same shape, scoped to `assignedPartnerStaffId = self` only, **excludes**
  funding data entirely (plan Section 5a — confirmed, not open).
- Move the Phase 2 document review UI out of `/admin` into the Coordinator/Partner Staff
  dashboards, gated by the new guards — retires the Phase 2 stopgap.
- `/admin/wioa/boards` — CRUD for `WorkforceBoard`/`AjccCenter`/`WorkforceJurisdiction`/
  `WorkforceContact`, satisfying the "no-code-change routing" requirement the plan cites from
  the spec. `/admin/wioa/document-requirements` — CRUD for `WioaDocumentRequirement`, replacing
  Phase 2's hardcoded seed.

**Depends on:** Phase 2 (cases/documents must exist to have a dashboard over).

**Explicitly NOT built yet:** Funding/gating (Phase 4) — Coordinator dashboard's funding section
ships empty/placeholder until then.

**Completion criteria:** A promoted Partner Staff account only sees their assigned cases with no
funding data visible; a promoted Coordinator sees every case; Admin can add a new
`WorkforceBoard`/contact and see it affect matching without a deploy.

---

## Phase 4 — Funding + Gating ✅

**Goal:** Tuition approval becomes a real, enforced gate on restricted courses.

**Build:**

- `EtplFundingRequest` + `FundingAuthorization`, tracking the 8 milestones as separate fields
  (plan Section 5) — visible on the Coordinator dashboard's funding section (placeholder from
  Phase 3, now filled in).
- `CourseUnlock (id, learnerId, courseId, source, grantedAt, grantedBy)` table.
- Wire the case reaching `Tuition Approved` (last of the 18 statuses before the two closing
  states) to insert a `CourseUnlock` row with `source = WIOA_FUNDING`.
- **Fix the confirmed gap (Conflict #1):** add the `CourseUnlock` check inside
  `getOrCreateEnrollment` in `src/lib/actions/progress.ts` — one check point covers `enroll`,
  `markLessonComplete`, `recordQuizAttempt`, and `submitEvidence` at once, closing all four
  currently-open entry points identified above, not just the Enroll button.
- Enrollment logic asks exactly one question per the plan: `course.access === 'OPEN'` OR a
  `CourseUnlock` row exists for `(learnerId, courseId)` — it never reads `WioaCase` or
  `fundingSource` directly.
- `Admin assignment` path (`source = ADMIN_ASSIGNMENT`): a minimal Admin action to insert a
  `CourseUnlock` row directly for a learner+course — this is the "real assignment mechanism"
  `../product/PRODUCT_CONTEXT.md` §15 already defers; build only the write path here, not a full UI beyond
  what's needed to demo both `CourseUnlock` sources working.
- Case continues past `Tuition Approved` to its own closing status
  (`Apprenticeship Enrollment Complete` / `Closed / Ineligible`) — a record on the case, no LMS
  behavior tied to it.

**Depends on:** Phase 2 (status pipeline must exist and be trustworthy before wiring a gate to
its terminal status) and Phase 3 (Coordinator dashboard is where funding milestones surface).

**Completion criteria:** A restricted course stays locked through `enroll`,
`markLessonComplete`, `recordQuizAttempt`, and `submitEvidence` (verified by attempting each
directly, not just via the hidden Enroll button) until the case reaches `Tuition Approved`, at
which point it unlocks with no other code path involved.

---

## Corrections / decisions log

Keep this section updated whenever a locked decision changes mid-build, so we don't relitigate it.

- **2026-09-09 — This doc created.** Closed `../wioa/WIOA_INTEGRATION_PLAN.md` Section 9's remaining
  open items (matching precedence, role routes, `fundingSource` enum, email template ownership,
  status/phase transition rules, PII posture, Evidence-storage boundary) and confirmed three
  real conflicts against the already-migrated Supabase codebase (unguarded `getOrCreateEnrollment`,
  two-role-hardcoded `proxy.ts`, no `LearnerProfile` table) — see "Conflicts with what's already
  built" above.
- **2026-09-09 — Phase 1 verified and marked ✅.** Manual verification against the 6-step
  checklist passed (new WIOA signup + matched ZIP, matched office view, send outreach email,
  Call/View Requirements, no-match ZIP, existing pre-WIOA account hitting `/learner/funding`
  directly). Starting Phase 2 (Case + Documents).
- **2026-09-09 — Phase 2 built, pending manual verification.** All Build bullets landed:
  `WioaCase`/`WioaStatusHistory`/`Appointment`/`WioaDocumentRequirement`/`WioaDocument` +
  `WioaCaseStatus` enum (migration `20260909102353_wioa_phase2_case_documents`); `sendWioaOutreach`
  now creates the `WioaCase` (status `INITIAL_CONTACT_SENT`) on first send per course and generates
  its document checklist (skipping the EDD Award Letter unless
  `unemploymentInsuranceStatus` indicates recent UI activity — `src/lib/wioa/documents.ts`); CA
  document requirement set seeded per board (`prisma/seed-wioa-documents.ts`, run once against the
  already-seeded Phase 1 boards — `prisma/seed-wioa.ts` also seeds it for a fresh DB bootstrap);
  Supabase Storage private bucket `wioa-documents`, lazily created on first upload
  (`src/lib/supabase/wioa-storage.ts`); learner upload UI + consolidated activity feed
  (`src/app/learner/funding/WioaCaseFeed.tsx`); staff review + status-advance UI under `/admin/wioa`
  (list + detail), explicitly temporary per the Build bullet. Implementation decisions made during
  the build, not previously written down: (1) the 18 statuses map to the 6 UI phases as
  Registration→[Registered], Matching→[Workforce Board Matched], Contact→[Initial Contact Sent,
  Awaiting Response], Eligibility Process→[Orientation Scheduled through WIOA Eligible, 9
  statuses], Funding Request→[ETPL Training Requested, Training Authorization Pending, Tuition
  Approved], Enrollment→[Apprenticeship Enrollment Complete] (`src/lib/wioa/status.ts`); (2) the
  spec's "when all applicable documents are uploaded, change Documents Pending → Documents
  Submitted" rule is the one learner-triggered status transition, implemented as an automatic
  check in `uploadWioaDocument` — every other transition stays staff-only via
  `advanceWioaCaseStatus`; (3) scheduling an Appointment is folded into the same staff action as
  advancing to `ORIENTATION_SCHEDULED`/`INTAKE_APPOINTMENT_SCHEDULED`, not a separate screen.
  Not yet manually verified — do that before marking Phase 2 ✅.
- **2026-09-09 — Phase 3 built, pending manual verification.** All Build bullets landed:
  `PARTNER_STAFF`/`WIOA_COORDINATOR` added to the role mechanism, with `src/lib/roles.ts` as the
  new single source of truth for the role list and role→home-prefix map (`ROLE_HOME`) — both
  `src/proxy.ts` (Conflict #2: the two hardcoded `if` blocks became a loop over `ROLE_HOME`
  entries) and `src/lib/supabase/server.ts`'s `getRole` now read from it instead of hardcoding the
  role set separately; `scripts/promote-admin.ts` was replaced (not kept alongside) by
  `scripts/promote-role.ts <email> <role>`; `guard.ts` gained `requirePartnerStaff()` /
  `requireCoordinator()`. `src/lib/actions/wioa.ts`'s document-review/status-advance/document-URL
  actions moved off `requireAdmin` onto a new `requireCaseAccess()` helper (Coordinator: any case;
  Partner Staff: only their `assignedPartnerStaffId` case) — this fully retires the Phase 2
  `/admin/wioa` stopgap (deleted, not left in place) rather than layering the new roles on top of
  admin access. `assignWioaCasePartnerStaff` is a new action (Admin or Coordinator) wiring up
  `WioaCase.assignedPartnerStaffId`. `/coordinator` (all cases, phase filter, follow-up queue,
  assignment dropdown) and `/partner` (same case list/detail UI, scoped server-side to
  `assignedPartnerStaffId = self`, no assignment control, no funding section) share one set of
  components (`src/components/wioa/WioaCaseListView.tsx`,
  `src/components/wioa/WioaCaseDetailView.tsx`) parameterized by an optional
  `partnerStaffRoster` prop rather than being duplicated per role. `src/lib/data/wioa.ts`'s
  `getAllWioaCases` became `getWioaCases(opts?: { assignedPartnerStaffId })` for this. Follow-up
  queue is a client-side filter (`AWAITING_RESPONSE` status or any pending document) — no new
  schema for it. `/admin/wioa/boards` (CRUD for WorkforceBoard, tabbed detail page for its AJCC
  Centers/ZIP Jurisdictions/Contacts) and `/admin/wioa/document-requirements` (CRUD per board,
  replacing `prisma/seed-wioa.ts`'s hardcoded set as the source of truth going forward — the seed
  script still runs once to bootstrap a fresh DB) both use deactivate-not-delete for every entity
  that already had an `active` flag (same pattern as `Course.isPublished`); document requirements
  have no `active` flag in the schema, so they support edit but not delete/deactivate — flagged in
  the Add/Edit drawer's description that a custom conditional requirement's rule text is
  informational only (the one real conditional rule, EDD Award Letter, stays hardcoded by name in
  `src/lib/actions/wioa.ts`, per the schema's own `applicableRule` doc comment — not rebuilt into a
  rule engine here). `Sidebar.tsx`'s Admin/Learner "switch view" toggle was generalized to a
  `SWITCHABLE_ROLE` lookup and simply doesn't render for Partner Staff/Coordinator, who have no
  counterpart dashboard to switch to. `tsc --noEmit`, `eslint`, and `next build` all pass. Not yet
  manually verified — do that (promote a test account to each new role) before marking Phase 3 ✅.
- **2026-09-09 — Phase 4 built, pending manual verification.** All Build bullets landed:
  `EtplFundingRequest` (one per case, unique on `wioaCaseId`) + `FundingAuthorization` (one per
  request, unique on `fundingRequestId`) tracking the spec's 8 milestones as separate fields —
  `etplProviderConfirmed`/`submittedAt`/`caseManagerNotifiedAt`/`fundingReviewStatus` on the
  request, `itaIssuedAt`/`approvedAmount`/`approvalDate`/`trainingStartDate` on the authorization
  (migration `20260909110323_wioa_phase4_funding_gating`); `fundingReviewStatus` and both models'
  `status` fields are plain free-text strings, not enums — same "no rule engine for one prototype
  field" call as `WioaDocumentRequirement.applicableRule`, since the plan never pinned down a
  fixed value set for them. `CourseUnlock (id, learnerId, courseId, source[WIOA_FUNDING |
  ADMIN_ASSIGNMENT], grantedAt, grantedBy)` added, unique on `(learnerId, courseId)`.
  **Fixed Conflict #1**: `getOrCreateEnrollment` in `src/lib/actions/progress.ts` now throws
  before creating/reusing an enrollment for a `RESTRICTED` course unless a `CourseUnlock` row
  exists — one check point, so `enroll`, `markLessonComplete`, `recordQuizAttempt`, and
  `submitEvidence` are all gated at once, closing the previously-real direct-call gap (not just
  the hidden Enroll button). `advanceWioaCaseStatus` inserts a `CourseUnlock(source =
  WIOA_FUNDING)` row when a case reaches `TUITION_APPROVED`, but only if no unlock already exists
  for that learner+course — an earlier `ADMIN_ASSIGNMENT` grant is never downgraded/overwritten.
  New `grantCourseUnlock(learnerId, courseSlug)` action (Admin-only) is the minimal
  `ADMIN_ASSIGNMENT` write path — surfaced as a "Course access" card at the top of
  `LearnerProfileView.tsx` (Admin's learner detail page) listing every `RESTRICTED` course with a
  per-course Grant/Unlocked state, no bulk UI beyond that. `updateWioaFunding(caseId, fields)` in
  `src/lib/actions/wioa.ts` upserts both funding tables together, gated by `requireCoordinator()`
  directly (not `requireCaseAccess`) — funding is Coordinator-only, matching Phase 3's "Partner
  Staff dashboard excludes funding data entirely" decision; `getWioaCaseDetail` takes a new
  `{ includeFunding }` option so Partner Staff's own data fetch never queries or returns funding
  fields in the first place, not just skips rendering them — the field would otherwise still
  reach the client bundle via the shared `WioaCaseDetailView` component's serialized props.
  `WioaCaseDetailView.tsx` renders the new funding form (all 8 milestones + `trainingProgram`)
  only when `partnerStaffRoster` is passed, the same Coordinator-only gate the Assignment control
  already used. `tsc --noEmit`, `eslint`, and `next build` all pass. Not yet manually verified —
  do that (advance a case through every status to `Tuition Approved` and confirm the course
  unlocks; attempt `enroll`/`markLessonComplete`/`recordQuizAttempt`/`submitEvidence` directly
  against a still-locked restricted course and confirm each throws) before marking Phase 4 ✅.
  This is also the last of the four phases — the deferred combined verification pass across
  Phases 1–4 (see the top of this doc) can now happen.
- **2026-09-09 — Combined manual verification pass, Phases 1–4 marked ✅.** Walked the full
  checklist end to end against the running app (Supabase + local dev). Phase 1 re-confirmed
  (matched-ZIP signup, no-match screen, outreach logs a `WioaCommunication`). Phase 2: outreach
  creates the `WioaCase` + document checklist, learner uploads per requirement, staff
  accept/reject flips status and surfaces the rejection reason, re-upload clears it, every
  transition lands in `WioaStatusHistory`. Phase 3: promoted Partner Staff sees only its assigned
  case with no funding section present (not just hidden), Coordinator sees every case, Admin adds
  a new `WorkforceBoard` + ZIP jurisdiction via `/admin/wioa/boards` and a learner on that ZIP
  matches it live with no redeploy. Phase 4: a case advanced through the pipeline to
  `TUITION_APPROVED` inserts `CourseUnlock(source = WIOA_FUNDING)` and the learner can then enroll;
  a learner with no `CourseUnlock` is blocked at `getOrCreateEnrollment` for every RESTRICTED
  course (verified via `scripts/wioa-verify-gating.ts`, which exercises the shared gate query
  directly — the four server actions all funnel through that one check point); Admin's
  `grantCourseUnlock` produces an independent `CourseUnlock(source = ADMIN_ASSIGNMENT)` with no
  WIOA case involved.
  - **Bug fixed during the pass — learner Funding case feed never rendered.**
    `getWioaCasesForLearner` / `getWioaCaseDetail` returned the Prisma course *cuid* as
    `WioaCaseRecord.courseId`, but the learner Funding view keys its active-case lookup on the
    course *slug* (`getAllCourses()` maps `id` → `slug`). The lookup never matched, so the case
    status card and the document-upload UI were invisible even though the case existed. Both
    functions now select and return `course.slug`; field documented on the type.
  - **Bug fixed during the pass — a `CourseUnlock` never opened the course in the learner UI.**
    `CourseLearningView`, `PathwayCourseCard`, and `ExploreCourseCard` all gated purely on
    `course.access === 'restricted'` and ignored `CourseUnlock`, so an approved WIOA case (or an
    Admin grant) left the course showing "Locked" with no Enroll button — Flow B dead-ended right
    where it was supposed to open. Each now takes an `unlocked` prop; the three learner pages
    (`/learner`, `/learner/explore`, `/learner/courses/[courseId]`) fetch
    `getCourseUnlocksForLearner` and pass it through. The server-side gate was already correct;
    this was UI-only.
  - **QC tooling added** (not part of the module, kept for future verification):
    `scripts/seed-wioa-staff.ts`, `scripts/seed-wioa-learner.ts`,
    `scripts/wioa-fast-forward-case.ts` (walks a case forward through the linear pipeline by
    direct writes, stopping before `TUITION_APPROVED` so the unlock-firing transition is still
    done through the real action), and `scripts/wioa-verify-gating.ts`.
  - `tsc --noEmit`, `eslint`, and `next build` all pass after both fixes.
- **2026-09-10 — Second manual walkthrough (fresh case, one status at a time) — 2 backlog gaps
  found, not fixed.** Re-verified Phases 1–4 end to end on a newly-signed-up learner
  (`seed-wioa-learner`-style profile with a non-"Not applicable" UI status, so the EDD Award
  Letter requirement was exercised), walking all 9 Eligibility Process statuses individually via
  the Coordinator UI rather than the fast-forward script. Everything from the 2026-09-09 pass
  held. Two gaps surfaced, logged here as backlog rather than fixed immediately since neither
  blocks the prototype demo:
  1. **No document-completeness check before `WIOA_ELIGIBLE`.** `advanceWioaCaseStatus` only
     validates the requested transition is the legal next step in `nextStatusOptions` — it never
     checks `WioaDocument` status. A case can reach `WIOA_ELIGIBLE` (and from there `Tuition
     Approved`, firing the real `CourseUnlock`) with every required document still `MISSING`.
     This was a semi-deliberate gap — the plan already treats the board's real eligibility
     determination as happening entirely outside the app (no system-to-system integration), so
     the document checklist was always meant as a staff-visibility/coaching aid, not a hard gate
     — but nobody explicitly decided the pipeline should be allowed to advance with incomplete
     documents; it's just what "no check" defaults to. If tightened: block advancing past
     `WIOA_ELIGIBLE` (or `DOCUMENTS_PENDING`) unless every non-`NOT_APPLICABLE` requirement is
     `ACCEPTED`.
     **Fixed 2026-09-11:** `advanceWioaCaseStatus` now blocks the transition into `WIOA_ELIGIBLE`
     unless every document on the case is `ACCEPTED` or `NOT_APPLICABLE`, throwing an error naming
     the outstanding requirements — since every later status (through `TUITION_APPROVED`'s
     `CourseUnlock`) is only reachable via `WIOA_ELIGIBLE`, this one check gates the whole rest of
     the chain. `WioaCaseDetailView.tsx`'s `StatusCard` now catches that error and surfaces it
     under the "Advance to" field via `Field`'s existing `error` prop instead of failing silently.
  2. **Funding form has no per-status field locking.** `WioaCaseDetailView.tsx`'s funding form
     (both `EtplFundingRequest` and `FundingAuthorization` fields) renders as one always-editable
     block to a Coordinator regardless of case status — a Coordinator could fill in "Approved
     amount" or "Training start date" while the case is still at `ETPL Training Requested`, before
     any authorization has actually happened. Unlike gap 1, this was never discussed or decided
     either way in the plan — pure implementation oversight, not a deliberate "can't enforce this"
     call. If tightened: disable/hide the Authorization sub-section's fields until status ≥
     `Training Authorization Pending`.
- **2026-09-13 — Document upload hardening pass.** Added server-side file validation (magic-byte
  check + 10MB cap, `src/lib/supabase/wioa-storage.ts`), raised the Server Actions body limit to
  10MB (`next.config.ts`), and added a `WioaDocumentVersion` audit trail so a superseded upload
  (e.g. one later rejected) stays retrievable via signed URL instead of being silently overwritten
  or orphaned in Storage (`prisma/schema.prisma`, `uploadWioaDocument` in
  `src/lib/actions/wioa.ts`, "View past versions" in `WioaCaseDetailView.tsx`). One gap found and
  **not fixed, logged as backlog** — not blocking the prototype demo:
  1. **No cap on re-upload frequency or count per document.** A learner can re-upload the same
     document requirement an unlimited number of times, each up to 10MB; only one file is ever
     "current" per requirement (the DB enforces one row per case+requirement), but every prior
     upload is now retained forever in Supabase Storage as version history. At prototype scale this
     is harmless, but with no rate limit or max-versions cap, a script or confused/malicious user
     could drive unbounded Storage growth/cost and clutter the version-history UI with junk entries
     for one requirement. If tightened: cap total versions per document (e.g. 10) and/or rate-limit
     uploads (e.g. 1/minute) in `uploadWioaDocument`.
