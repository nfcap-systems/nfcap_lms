# WIOA Funding Module — Integration Plan (Prototype)

Planning document only — nothing in this doc has been built yet. Captures the decisions reached through discussion about how the WIOA Eligibility Matching & Enrollment spec (`docs/wioa/WIOA_Eligibility_Matching_App_Developer_Specification.pdf`) integrates with the existing NFCAP LMS prototype. Treat this as the source of truth for the WIOA module's shape until superseded by further discussion — same convention as `../product/PRODUCT_CONTEXT.md`.

Related docs:

- `docs/wioa/WIOA_Eligibility_Matching_App_Developer_Specification.pdf` — original developer spec (source requirements)
- `docs/product/PRODUCT_CONTEXT.md` — core LMS product context; this plan is additive to it, not a replacement

---

## 1. What This Is

WIOA (Workforce Innovation and Opportunity Act) is a federal program administered through **local workforce boards**, not the federal government directly. It funds apprenticeship tuition for eligible students. NFCAP, as a federally recognized apprenticeship program, is the kind of program this funding targets — a student can potentially get WIOA to pay for NFCAP training instead of paying out of pocket.

This module's job is **not** to run the WIOA process itself (that's a real government agency's job, entirely outside our control). Its job is to:

- Match a student to the correct local workforce board / AJCC / contact based on their address
- Help them start outreach to that office from inside the app
- Track their progress through that external process (documents, eligibility, funding) so NFCAP staff have visibility
- Use funding approval as a real gate for courses that require it

**There is no system-to-system integration with any government system** (no CalJOBS API, no data feed). The "connection" to the workforce board is human: an email, a phone call, and manually-updated status tracking by NFCAP staff based on what they learn from the student or the board.

---

## 2. Relationship to Existing Product Scope

`../product/PRODUCT_CONTEXT.md` §8 currently excludes Placement, employer/mentor roles, and apprenticeship hour tracking. WIOA funding is **not** Placement (it's funding access, not job-matching) and does not introduce an employer/mentor role — it introduces a **workforce board contact**, a new but narrow external-facing concept scoped only to the funding pipeline. This plan does not reopen or contradict any existing §8 decision. It is summarized in `../product/PRODUCT_CONTEXT.md` §16 — keep the two in sync whenever a decision here changes (§16's gating paragraph is currently out of date, see Section 9).

This module is built as a **parallel, independent pipeline** attached to the same learner — not a rework of the existing learning pipeline. It reuses existing UI/data patterns (status pipelines, evidence-review-style document review, role-gated dashboards) rather than inventing new paradigms.

**Confirmed against the actual codebase (`src/proxy.ts`)**: every route under `/learner` — including Explore itself — is already gated behind authentication. There is no anonymous browsing today; a student must create an account/sign in before seeing anything, not just before enrolling. This is stricter than a Udemy-style "browse freely, sign in only to start" model, and it reinforces the existing product positioning (Section 3/4 of `../product/PRODUCT_CONTEXT.md`: not a course marketplace). The WIOA module does not change this — it rides on top of the same already-gated experience: create account → sign in → Explore/Funding/everything else, with the new funding-approval gate applying only to specific `restricted` courses once the student is already inside.

---

## 2a. Verification Pass (against the full spec, section by section)

A full section-by-section pass was done against the spec after the first draft of this plan. Corrections identified as cheap/structural (schema-level) were folded directly into Sections 3–8 below. Everything genuinely deferred is tracked in Section 11, not silently dropped.

Corrections folded in:

- "View Requirements" added as a third learner-facing action alongside Email/Call (spec §3 step 4)
- `trainingApprenticeshipInterest` added to registration fields (spec §4 — "Required for funding workflow")
- `WioaDocumentRequirement` now scoped per board via `workforceBoardId` (spec §13/§17 — "configurable by workforce board")
- ETPL/funding milestones expanded from 2 generic-status tables to the 8 separately-tracked fields the spec requires (spec §14)
- Missing suggested fields added to Board/AJCC/Contact/Jurisdiction/Document records (spec §12/§13)
- `Appointment` entity added — status pipeline references ("Orientation Scheduled," "Intake Appointment Scheduled") need real date/time data behind them, not just a status label (spec §3/§11)
- `fundingSource` added: captured at registration as an editable signal for whether a student is pursuing self-pay or WIOA. Neither the spec nor the reference visual diagram model self-pay at all, so this was a decision made for this integration, not extracted from source material. (A later review pass narrowed its role — it drives nav/UX only and is **not** part of the enrollment check; see Section 4.)

---

## 3. Two Learner Flows

### Flow A — Self-Pay (existing, unchanged)

```
Sign up → Explore (open course) → Enroll (immediate) → Lessons →
Knowledge Assessment → Practical Evidence → Verification (Admin) →
Course Completion → Credential → Portfolio → Certificates
```

No WIOA involvement. This is the current app behavior and requires no changes.

### Flow B — WIOA-Funded

```
Sign up → Explore (restricted course) → [Enroll locked] →
Start WIOA process:
  Add address → Auto-matched to Workforce Board / AJCC / Contact →
  Review & send WIOA outreach email → WIOA Case auto-created →
  Upload required documents → Staff review (Accept/Reject/Resubmit) →
  Orientation → CalJOBS → Application → Intake Appointment →
  Eligibility Under Review → WIOA Eligible →
  ETPL Training Requested → Training Authorization Pending →
  Tuition Approved
→ Enroll unlocks → Lessons → Knowledge Assessment → Practical Evidence
→ Verification (Admin) → Course Completion → Credential → Portfolio → Certificates
```

The WIOA case continues past tuition approval to its own closing status (`Apprenticeship Enrollment Complete` or `Closed / Ineligible`) as a record on the case itself — this does not drive LMS behavior, it's the case documenting its own outcome.

---

## 4. The Gating Mechanism — Reusing the Existing Open/Restricted Concept

`../product/PRODUCT_CONTEXT.md` §8 already has a deferred, unresolved decision: _"enrollment/assignment eligibility is a per-course property (open vs. restricted) ... the exact rule ... is deferred."_

**Decision**: WIOA funding becomes one way a `RESTRICTED` course's unlock condition gets satisfied — not a new, WIOA-specific gate bolted onto Enrollment logic.

- Enrollment logic only ever asks: _"is this course open, or is it restricted and has this learner satisfied whatever unlocks it?"_ It has no knowledge of what satisfies a restriction — WIOA funding, manual admin assignment, or anything else later.
- The WIOA module's only responsibility toward Enrollment: when a case reaches `Tuition Approved`, mark that learner's restriction on that specific course as satisfied. It does not otherwise reach into or know about Enrollment.
- This keeps the two systems decoupled — the WIOA module can be developed, demoed, or removed without touching working Enrollment code — while still producing real gating behavior where it matters.
- This also resolves the "what if funding never gets approved" risk cleanly for WIOA-funded courses specifically: a student simply cannot start a restricted course until funding is approved, so there's no scenario of training happening and then funding failing. This risk only existed under a fully non-gating model, which this plan does not use for WIOA-marked restricted courses.
- Self-pay / open courses are entirely unaffected — no address collection, no funding questions, no gating, exactly as the app behaves today.

**Resolved — the unlock mechanism is a `CourseUnlock` table, and `fundingSource` is not a gate input.**

An earlier draft of this section made `fundingSource` part of the enrollment check ("is this student on the WIOA path, and if so is funding approved?"). That is unenforceable: `fundingSource` is self-declared and editable, so any learner could unlock any restricted course by flipping themselves to `SELF_PAY`. Corrected:

- `access: RESTRICTED` means **not self-enrollable, for everyone** — no exceptions, no per-learner reinterpretation.
- A restricted course opens for a learner when a `CourseUnlock (id, learnerId, courseId, source, grantedAt, grantedBy)` row exists. `source` records _why_ (`WIOA_FUNDING`, `ADMIN_ASSIGNMENT`, …).
- The WIOA module's only write into Enrollment's world: when a case reaches `Tuition Approved`, insert a `CourseUnlock` row with `source = WIOA_FUNDING` for that learner + that case's course.
- Self-pay learners reach a restricted course through **Admin assignment** (`source = ADMIN_ASSIGNMENT`) — which is the same "real assignment mechanism" `../product/PRODUCT_CONTEXT.md` §15 already defers. This plan doesn't build it; it just establishes the table both paths write into.
- Enrollment logic asks one question: _"is this course `OPEN`, or does a `CourseUnlock` row exist for this learner and course?"_ It never reads `WioaCase`, `fundingSource`, or anything WIOA-specific.

**What `fundingSource` is still for**: captured at registration alongside Training/Apprenticeship Interest, editable later from Profile or the Funding area, it decides **whether the Funding/WIOA area appears in the learner's nav** and pre-fills their intent. It is a routing/UX signal, not an authorization signal.

**Enforcement must cover every enrollment entry point.** In the current codebase `restricted` is a display-only concept — the Enroll button is hidden in the UI, but `src/lib/actions/progress.ts` creates enrollments from four separate server actions (`enroll`, `markLessonComplete`, `recordQuizAttempt`, `submitEvidence`, all via `getOrCreateEnrollment`) with no access check. Phase 4 must add the `CourseUnlock` check inside `getOrCreateEnrollment` itself, not on the Enroll button alone.

---

## 5. Data Model (Prisma) — Additive Only

No existing table's shape changes. Learner identity remains Supabase-native; the following are new tables.

```
WorkforceBoard        (id, name, county, serviceArea, phone, email, website, address,
                        orientationUrl, applicationUrl, active)
AjccCenter             (id, workforceBoardId, name, address, phone, website,
                        intakeInstructions, active)
WorkforceJurisdiction  (id, zip, city, county, workforceBoardId, ajccCenterId,
                        effectiveDate, active)
WorkforceContact       (id, workforceBoardId, ajccCenterId, name, title, email, phone,
                         contactType[PRIMARY/SECONDARY/GENERAL], priority, active,
                         lastVerifiedDate)

WioaCase               (id, learnerId, courseId, workforceBoardId, ajccCenterId, contactId,
                         assignedPartnerStaffId, status, closedAt, createdAt)
                        -- scoped per learner PER COURSE (see below)
WioaStatusHistory       (id, wioaCaseId, status, changedAt, changedBy)   -- immutable log

CourseUnlock            (id, learnerId, courseId, source[WIOA_FUNDING/ADMIN_ASSIGNMENT],
                         grantedAt, grantedBy)   -- the only thing Enrollment reads (Section 4)

Appointment             (id, wioaCaseId, type[ORIENTATION/INTAKE/FOLLOWUP], scheduledAt,
                         completedAt, notes)

WioaDocumentRequirement (id, workforceBoardId, name, description, conditional bool,
                         applicableRule)  -- admin-configurable, scoped per board
WioaDocument            (id, wioaCaseId, requirementId, fileName, storagePath,
                          status[MISSING/UPLOADED/UNDER_REVIEW/ACCEPTED/REJECTED/NA],
                          reviewedBy, reviewedAt, rejectionReason, expirationDate, notes)

WioaCommunication       (id, wioaCaseId, channel[EMAIL/CALL], recipient, subject, body, sentAt, sentBy)

EtplFundingRequest      (id, wioaCaseId, trainingProgram, etplProviderConfirmed bool,
                         submittedAt, caseManagerNotifiedAt, fundingReviewStatus, status)
FundingAuthorization    (id, fundingRequestId, itaIssuedAt, approvedAmount, approvalDate,
                         trainingStartDate, status)
```

**Resolved — case scope is per learner _per course_.** `WioaCase` carries a `courseId`: the specific restricted course this funding request is for. Rationale: §4's unlock step has to name a course, ETPL funding is authorized per training program (not per person), and a learner pursuing a second course — or re-applying after a `Closed / Ineligible` outcome — gets a second case with its own clean status history rather than overwriting the first. Uniqueness is on **active** cases only (`learnerId + courseId` where the case is not closed), so re-application after closure is legal.

`assignedPartnerStaffId` on the case is what makes the `PARTNER_STAFF` role's "their assigned students only" scoping implementable — without it the role has no definition. Assignment is done by Admin or Coordinator from the WIOA Cases dashboard (Phase 3).

The `EtplFundingRequest`/`FundingAuthorization` split now separately tracks all 8 milestones the spec calls out (ETPL provider confirmed, request submitted, case manager notified, funding review, ITA issued, approved amount, tuition approval date, training start/enrollment) as distinct fields rather than a single generic status — per spec §14's explicit "track separately" rule.

**Learner profile additions** (new fields, not a new user table): `streetAddress, city, state, zip, preferredLanguage, employmentStatus, unemploymentInsuranceStatus, trainingApprenticeshipInterest, fundingSource` (`SELF_PAY` / `WIOA_PENDING`, editable after registration — a nav/UX signal only, **not** a gate input; see Section 4). `dateOfBirth` and `mobilePhone` are **also new** — an earlier draft assumed they came from core signup; they don't. The only learner data anywhere today is Supabase Auth's `user_metadata.name` plus email (`src/lib/data/learners.ts`); there is no profile table. **Resolved**: these fields are collected **at registration** (the current `SignupForm.tsx` is minimal today — name/email/password only — and will be extended), matching the reference visual's Step 1, rather than deferred to Profile/contextual collection. Storage location still to be confirmed at implementation time — Supabase `user_metadata` preserves the "Auth is the only user store" property the codebase relies on today, but a `LearnerProfile` table in Postgres is the better fit for anything the matching engine or admin dashboards need to query (address/ZIP especially). Introducing one would be the app's first Postgres-side user record — a small but real departure from the current design, worth deciding deliberately rather than in passing.

**Roles**: extend the existing role mechanism with `PARTNER_STAFF` and `WIOA_COORDINATOR`, following the same promotion pattern as the existing Admin role. See Section 5a for the full role breakdown.

---

## 5a. Roles — Full Breakdown

The spec (Section 2) defines four roles. Two map directly onto existing roles; two are new and are built as **distinct roles with their own scoped access**, not collapsed into a shared shell.

| Spec role            | Maps to                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Student**          | Existing `LEARNER`         | Same person, same login. Gains a new "Funding" area in their experience. Not a new role.                                                                                                                                                                                                                                                                                                                                                    |
| **Administrator**    | Existing `ADMIN`, extended | Gains management of workforce boards, AJCCs, jurisdictions, contacts, document requirements, and email templates — same role that already does curriculum authoring today. Not a new role.                                                                                                                                                                                                                                                  |
| **Partner Staff**    | New: `PARTNER_STAFF`       | Scoped to **their assigned students only**. Can view progress, flag missing documents, record follow-up notes, review/accept/reject documents for their students. Does **not** manage board/contact/jurisdiction data (that's Admin-only) and does **not** see funding amounts/requests — confirmed via the reference visual's Partner Dashboard, which lists completion rates/missing requirements/reports but never funding data.         |
| **WIOA Coordinator** | New: `WIOA_COORDINATOR`    | Broader than Partner Staff — monitors **all** cases (not just assigned ones), tracks communications, appointments, eligibility progress, and **funding requests/authorizations** end to end — the reference visual's Coordinator Dashboard explicitly calls out "monitor funding requests," confirming funding visibility sits here, not with Partner Staff. Effectively the operational owner of the WIOA pipeline, one level below Admin. |

Both new roles are added to the same role mechanism Admin already uses (`app_metadata.role`, promoted the same way `scripts/promote-admin.ts` promotes Admin today — likely a generalized promotion script rather than one script per role). Each gets its own gated dashboard view of the WIOA Cases area, scoped per the table above, rather than sharing one undifferentiated view. **Resolved**: Partner Staff has no funding-amount visibility; WIOA Coordinator does — confirmed against the reference visual's two dashboard descriptions, no longer an open item.

---

## 6. What's Real vs. What's Mocked in the Prototype

The requirement is that the **flow** be fully walkable end to end with no gaps — every screen and status must exist and function. What's allowed to be fake is the **data behind it**, not the flow itself.

| Concern                                                   | Prototype approach                                                                                                                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Real ZIP → board geodata for all US ZIPs                  | Seed ~10–20 sample ZIPs across a few counties — enough to demonstrate the matching engine genuinely working, stored in an admin-editable table (not hardcoded), per the spec's own rule that routing must be admin-editable without a deployment |
| Real email delivery to workforce board staff              | Generate the email, let the student review and confirm send, log it to `WioaCommunication` — actual delivery can be a no-op or dev inbox, but generate → review → confirm-sent → logged must be real                                             |
| Encrypted file storage, signed URLs, MFA, full audit logs | Reuse Supabase Storage (already in the stack) with a private bucket for real "not a public URL" behavior. Full audit-log table and MFA are production-hardening concerns, explicitly deferred, noted here so they aren't silently forgotten      |
| CalJOBS / external agency sync                            | Manual status toggle by staff — never build a fake integration; the spec itself treats this as a manual, human-driven step                                                                                                                       |
| Multi-state document rules                                | Scope to California only for now (the spec's own documents — CA Driver License, EDD — are California-specific). Confirm with NFCAP if multi-state coverage is ever needed                                                                        |

---

## 7. Information Architecture

**Learner side** — new top-level area, sibling to Portfolio (not folded into Explore/My Learning):

- `Funding` / `WIOA` — matched board/contact, case status, document checklist, and three actions: **Email, Call, View Requirements** (spec §3 step 4)
- This area doubles as a **consolidated activity feed** — a read-only view pulling together the outreach log (`WioaCommunication`), upcoming appointments (`Appointment`), document status (`WioaDocument`), and next-step guidance (derived from `WioaCase.status`). This is a UI screen over data already in the model, not a new entity.
- **Explicitly not building**: real two-way in-app messaging (a staff↔student chat/inbox). The only communication channels are outbound email (logged), click-to-call, and document rejection-reason text. The source spec never asks for in-app chat; a reference visual implied something like it, but on inspection its bullets (view messages, appointments, documents, next steps) map cleanly onto the read-only feed above. If NFCAP later has a real need for live in-app messaging, that would be a new, deliberate scope decision — not something to infer from a diagram.

**Admin side** — new top-level section, sibling to Learners:

- `WIOA Cases` — pipeline/cohort dashboard, filters, follow-up queue (mirrors the existing `/admin/learners` pattern)
- `Workforce Boards` — CRUD for boards/AJCCs/jurisdictions/contacts (the no-code-change routing requirement)
- Document review reuses the existing Evidence-review UI pattern, pointed at `WioaDocument` instead of `EvidenceSubmission`

---

## 8. Phased Build Order

**Phase 1 — Match**
Profile address fields; `WorkforceJurisdiction` / `WorkforceBoard` / `AjccCenter` / `WorkforceContact` tables + seed data; ZIP → board matching function; learner-facing "your matched office" card with Email/Call actions (email flow can be stubbed to just log at this phase).

**Phase 2 — Case + Documents**
`WioaCase` + the **full 18-status pipeline** (resolved — see below), backed by `WioaStatusHistory`; `WioaDocumentRequirement` + `WioaDocument` with upload (Supabase Storage) and staff accept/reject UI, mirroring the existing EvidenceSubmission review pattern.

**Resolved — status granularity**: build all 18 statuses in the data model, not a reduced set. Cross-checking the reference visual's sub-bullets against the spec's 18 statuses showed every single one is represented somewhere in the diagram (e.g., "Attend orientation," "Create CalJOBS account," "Case manager review, ITA issued" all map 1:1 to spec statuses) — the diagram isn't proposing fewer real events, it's grouping the same 18 into 6 friendlier phases for display. So the resolution is two-layer: **full 18 statuses at the data/backend level**, grouped into the same **6 visual phases** the diagram uses (Registration → Matching → Contact → Eligibility Process → Funding Request → Enrollment) for the student-facing progress UI.

**Phase 3 — Dashboards**
Admin WIOA Cases dashboard (pipeline view, filters, follow-up queue); Workforce Boards admin CRUD.

**Phase 4 — Funding + Gating**
`EtplFundingRequest` + `FundingAuthorization`, tracked as visibly separate from eligibility per the spec's own rule. Add the `CourseUnlock` table and wire `Tuition Approved` to insert a `WIOA_FUNDING` row for the case's course (Section 4). Add the unlock check inside `getOrCreateEnrollment` so all four enrollment-creating server actions are gated, not just the Enroll button.

This order front-loads the most novel piece (the matching engine) and defers the piece with the least new architectural risk (funding tracking is another status table, same shape as everything before it) — and puts gating last, once the underlying case/status machinery already exists and is trustworthy.

---

## 9. Open Decisions / Things to Confirm

Resolved in earlier passes: where profile fields are collected (at registration — Section 5), status granularity (full 18, grouped into 6 UI phases — Section 8), and the Partner Staff/Coordinator funding-visibility split (Section 5a). Resolved in the review pass that produced this version: the unlock mechanism (`CourseUnlock` table, `fundingSource` demoted to a UX signal — Section 4) and case scope (per learner per course — Section 5). This plan is already reflected in `../product/PRODUCT_CONTEXT.md` §16; **§16's gating paragraph needs updating to match Section 4's corrected `CourseUnlock` decision.**

**Locked for the prototype**: California-only scope. This is a working assumption, not a confirmed real-world fact about NFCAP — to be asked of NFCAP later, outside this prototype. Building CA-only for now (per Section 6/11); if NFCAP later confirms other states are needed, the retrofit path is already documented in Section 11 (generalize `WioaDocumentRequirement.applicableRule` by state — a data/config change, not an architecture change).

### Still to settle before Phase 1

- **Matching precedence and the no-match path.** ZIP-only, or ZIP → city → county fallback? What does `effectiveDate` mean operationally (temporal versioning, or just a note)? Most importantly: with only 10–20 seeded ZIPs, **"no board found for your address" is the most likely demo outcome**, so it is a required Phase 1 screen with a defined recovery (proposed: the case still opens in a `Matching` status an Admin resolves by hand).
- **Where the new roles live.** `src/proxy.ts` hard-confines `ADMIN` to `/admin/*` and `LEARNER` to `/learner/*`, and `src/lib/actions/guard.ts` only has `requireAdmin`. `PARTNER_STAFF` and `WIOA_COORDINATOR` need a route namespace, a home route, a nav list, and a per-role server-action guard before either dashboard can be built.
- **Close the `fundingSource` enum.** Section 5 currently says "`SELF_PAY` / `WIOA_PENDING`, etc." — the value set has to be finite even though it's no longer an authorization input.
- **Email template ownership in Phase 1.** Admin-managed templates are deferred to Section 11, but Phase 1 sends outreach email — so the interim template needs a home, a sender identity, and a decision on whether the student may edit the body before confirming send.

### Still to settle before Phase 2

- **Enumerate the 18 statuses in this document**, mapped to their 6 UI phases. Section 8 resolved the _granularity_ but never listed them, so today they can only be re-derived from the PDF.
- **Who advances each status, and how.** Proposed default: every transition is staff-driven (Coordinator for any case, Partner Staff for their assigned cases); the learner never self-advances, they only upload documents. Also undecided: whether transitions are strictly linear, skippable, or reversible, and what drives `Closed / Ineligible`.
- **`Appointment` vs. the appointment-shaped statuses.** "Orientation Scheduled" exists both as a case status and as an `Appointment` row — decide which is authoritative and whether creating an appointment auto-advances the status.
- **PII posture, stated explicitly.** WIOA documents (SSN, driver's license, EDD records) are the most sensitive data in the app, and audit logging + MFA are deferred (Section 11). Proposed: **demo/seeded documents only — no real learner PII in the prototype**, written down rather than assumed.
- **Phase 2 contains this project's first real file upload.** `../product/PRODUCT_CONTEXT.md` §12/§13 records that Practical Evidence is deliberately filename-only with no Supabase Storage integration. Phase 2 both "reuses the Evidence-review pattern" and introduces real private-bucket uploads — decide whether Evidence gets upgraded alongside it, and size the phase accordingly.

### Known consequence, accepted

- **No staff → learner notification channel.** In-app messaging is excluded (Section 7) and automation/reminders are deferred (Section 11), so a document rejection reason reaches the learner only when they next open the Funding page. Acceptable for the prototype; noted so it isn't discovered as a surprise.

---

## 10. Status

**Planning complete for the items above. No implementation has started.** Next step, when ready, is Phase 1 (Match).

---

## 11. Deferred Items — Tracked for Later

Everything below is a deliberate deferral, not an oversight (oversights were corrected directly into Sections 3–8 — see Section 2a). Kept in one place so nothing gets silently forgotten as phases get built. Each entry: what's deferred, why, and what "picking it back up" looks like.

### Infrastructure / scale (defer because building real versions now has no prototype value)

| Deferred                                                                            | Why                                                                                                                                 | Picking it back up later                                                                                             |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Full US ZIP → workforce board coverage                                              | Only need to prove the matching logic works; full data entry is a content task, not a build task                                    | Seed more `WorkforceJurisdiction` rows — no schema or logic change needed                                            |
| Real email delivery to workforce boards                                             | Prototype has no real workforce board to receive it                                                                                 | Swap the log-only send for a real transactional email call once there's a reason to actually send                    |
| Full production security (MFA, complete audit-log table, retention/deletion policy) | Supabase Storage private buckets already satisfy the "no public URLs" requirement, which is the part with real prototype-demo value | Add `audit_logs` table + MFA enforcement as a hardening pass before any real production deployment, not before       |
| Multi-state document rules (currently CA-only assumption)                           | Spec's own required documents (CA Driver License, EDD) are California-specific; unconfirmed whether NFCAP needs other states        | Confirm NFCAP's real operating states; if more than CA, generalize `WioaDocumentRequirement.applicableRule` by state |
| CalJOBS / any external agency system sync                                           | Spec itself treats this as a manual, human step — not a deferral so much as permanently out of scope                                | N/A — no real integration is ever expected here                                                                      |

### Feature areas (defer because they layer on top of a pipeline that doesn't exist yet)

| Deferred                                                                                                                               | Why                                                                                                                                                                                                                                                                                                                                                                                                  | Picking it back up later                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automation & Follow-Up Rules (spec §18) — no-response reminders, pending-doc nudges, rejection notices, upcoming-appointment reminders | Needs a working case/status/appointment pipeline to trigger off of; building it first would have nothing real to hook into. Confirmed deferred even though a reference visual flow (provided outside this doc) shows the 3-business-day no-response reminder as a core step in the primary flow — deliberately keeping all automation rules, including that one, out of Phases 1–4 for the prototype | Add as a Phase 5, once Phases 1–4 are stable — each rule is a scheduled check against existing tables (`WioaCase`, `WioaDocument`, `Appointment`), no new core entities needed                                                                                                                                                                                                                                                                |
| Dashboard analytics — document readiness %, board performance (approval rate, avg days to eligibility, funding conversion)             | Purely computed queries over data produced by Phases 1–4; nothing to model before that data exists                                                                                                                                                                                                                                                                                                   | Build as read queries/UI in Phase 3, once there's real case/document/funding data to query                                                                                                                                                                                                                                                                                                                                                    |
| Multi-organization architecture (spec §21)                                                                                             | Nothing in current scope requires supporting orgs beyond NFCAP; same reasoning already applied to Program/Pathway Builder in `../product/PRODUCT_CONTEXT.md` §8                                                                                                                                                                                                                                                 | Add `organizationId` to `WorkforceBoard`/`WioaCase` (and `Course` if needed), backfill existing rows to NFCAP's org, add org-scoping to queries/permissions. Guardrails to keep this cheap, to follow while building now: don't make `zip` alone unique on `WorkforceJurisdiction`; don't hardcode "NFCAP" as a literal anywhere in matching/dashboard logic; scope admin permission checks to "manages this board" rather than "is an admin" |
| Admin console extras — email template management, full ETPL/training-program CRUD, organizations/partners/cohorts management           | Real §17 requirements, but expansion of the admin surface after the core 4 phases prove out, not blockers to the core flow                                                                                                                                                                                                                                                                           | Add as admin screens once Phases 1–4 exist to manage                                                                                                                                                                                                                                                                                                                                                                                          |

### Open decisions (defer because no cost to waiting, listed again here for one-stop tracking)

- The financial-risk question ("who bears cost if funding is denied after training starts") — genuinely out of scope because the spec itself never addresses it, not something to guess into the architecture

(Full 18-status granularity, the Partner Staff/Coordinator funding-visibility split, and the "Tuition Approved → restriction satisfied" wiring were open items here too — all resolved, see Sections 8, 5a and 4.)

Same-list convention as Section 9 — resolving any of these updates both sections together.
