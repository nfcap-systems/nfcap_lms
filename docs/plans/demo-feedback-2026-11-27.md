# Client demo feedback — 2026-11-27

**What this is:** the register of everything the client raised in the demo on 2026-11-27, captured
so it survives a cleared session. It is **not** a plan — each item gets planned separately, with
rated options, and nothing is built until that item's plan is approved.

**What the demo ran against:** the deployed staging site. `.github/workflows/deploy-staging.yml`
deploys on push to `stage`, and `stage` contains `65e11ca2` — the 2026-11-25 master/course WIOA
rewrite. **The client saw current code, not a pre-rewrite build.** Every item below is a complaint
about what is on `stage` today.

**Process:** Plane is still disconnected, so this file is the local source of truth for these items,
the same fallback `docs/plans/notifications-and-upload-cap-kickoff.md` uses. `DEMO-*` ids follow the
existing `NOTIF-*`/`CAP-*` convention. When Plane returns, each becomes a ticket labelled
`found-by-client` (`docs/DEV-APPROACH.md` → Found-by labels). Items touching an already-approved
board need a fresh approval recorded in `docs/MOCKUP-INDEX.md` before build, per the same doc.

**Related:** `docs/build/DEFECTS_AND_HARDENING.md` holds defects that aren't one of the 65 scoped
features. Roughly half of this list is design/UX change rather than defect, so the list is kept
whole here and cross-referenced there rather than split across two files.

**Not in scope for whoever picks this up:** the Phase 6 notifications foundation and WIOA
upload-cap track (`docs/plans/notifications-and-upload-cap-kickoff.md`) is owned by a different
lead session with an executor mid-build. `DEMO-4` below touches its boundary — see the note there.

---

## The standing principle (a review criterion, not a ticket)

**Applicants for the apprenticeship often lack technical fluency.** The client's headline takeaway
from the demo. Every item below is judged on whether a non-technical applicant can complete the
screen unaided — this is the acceptance bar for all of them, which is why it is not a work item of
its own.

---

## The register

| ID | Item | Area | State |
| --- | --- | --- | --- |
| `DEMO-1` | Coordinator WIOA screen is confusing; each pipeline needs unmistakable steps | Coordinator UI | Not started |
| `DEMO-2` | Eligibility and course-funding must read as two clearly separate tracks | Coordinator UI | Not started |
| `DEMO-3` | **The funding pipeline has no UI caller at all** — no course case can be advanced, so no course is ever unlocked | Coordinator UI + actions | **Verified** — see below. Planned: `docs/plans/demo-1-2-3-coordinator-wioa-plan.md` |
| `DEMO-4` | A WIOA-eligible learner is never told they are eligible | Learner UI (+ notifications boundary) | Not started |
| `DEMO-5` | Signup form uses free text where the answer is from a known set | Learner form | Not started |
| `DEMO-6` | Signup form needs sensible prefilled defaults (US dialling code; dependent ZIP) | Learner form | Needs a data-source decision |
| `DEMO-7` | Funding amounts must be real USD currency | Funding UI | Needs detail from the demo |

**The client's stated priority is the WIOA funding mapping** (`DEMO-1` through `DEMO-4`): it must
work end to end with no errors.

---

### `DEMO-1` — Coordinator dashboard is confusing

The coordinator's case screen is not clear. Each pipeline must show clear steps so a coordinator can
tell at a glance where a case stands and what happens next. No ambiguity.

Current structure (`src/components/wioa/WioaCaseDetailView.tsx`): three tabs — Overview, Documents,
History — with Status, Funding, Documents and Appointment cards inside Overview.

Open: no screenshot of what the client was looking at when they called it confusing, and no decision
yet on whether the information architecture may change or this is a re-layout of the existing screen.

### `DEMO-2` — Two tracks, tracked and shown separately

WIOA **eligibility** (is this person eligible at all) and **course funding** (is this course paid
for) are two different pipelines. They must not blur together, in the data or on screen, and both
must be error-free.

The data model already separates them cleanly: `WioaCase` (one per learner, `WioaEligibilityStatus`,
14 states) and `WioaCourseCase` (one per learner per course, `WioaFundingStatus`, 5 states, only
creatable once the master case is `WIOA_ELIGIBLE`). The gap is in how the coordinator UI presents
them, not in how they are stored.

### `DEMO-3` — The funding pipeline was never wired to any screen — VERIFIED

Reported as "there's no tracking for the second course." The investigation found something larger:
**no** course case can be advanced, first or second.

`advanceWioaFundingStatus` (`src/lib/actions/wioa.ts:630`) is the only function that moves a funding
case forward, and the only thing that fires `CourseUnlock` at `TUITION_APPROVED`. It has no caller
outside `tests/unit/wioa-status.test.ts`. So no course is ever unlocked through WIOA funding, and
the coordinator's Funding form writes to a different pair of records (`EtplFundingRequest` /
`FundingAuthorization`) that do not drive the pipeline — it saves successfully and moves nothing.

Full analysis, the secondary defects, and the two-ticket plan:
`docs/plans/demo-1-2-3-coordinator-wioa-plan.md`.

Also verified 2026-11-27 against `stage`:

- **The learner side is correct.** `requestCourseFunding` (`src/lib/actions/wioa.ts:242`) creates a
  separate `WioaCourseCase` per course, dedupes open requests, and `FundingView` renders an
  independent timeline per request with already-requested courses filtered out of the picker. The
  id/slug plumbing was checked end to end (`AdminCourse.id` is the slug; `WioaCourseFundingRecord
  .courseId` is mapped to the slug too) — consistent, no defect there.
- **The coordinator side is hard-wired to the first course.**
  `src/components/wioa/WioaCaseDetailView.tsx:713` reads
  `const courseCaseId = wioaCase.fundingRequests?.[0]?.id;`. A second course case is created and
  stored, but no staff member can see or advance it.

This is a documented loose end, not an accident: `src/lib/data/wioa.ts:505-509` labels the
`courseTitle` and `funding` fields *"back-compat for UI call sites not yet reworked for the full
master/course split."* The data layer already returns the complete `fundingRequests` array; this
consumer was never updated to use it.

**Planned together with `DEMO-1`/`DEMO-2`** — same screen, and this constrains the redesign (the
layout has to hold N course cases under one master case), so doing them separately means doing the
screen twice.

### `DEMO-4` — An eligible learner is never told

Eligibility is determined and the learner is not informed.

**Boundary:** "notify the learner" is a notification trigger, and the notifications foundation is
owned by another lead session with an executor mid-build. The part in scope here is what the
learner's own Funding page shows when their master case reaches `WIOA_ELIGIBLE`. Anything requiring
a notification or an email is that track's, not this one's — and email to real addresses is blocked
anyway until a sending domain is verified (`docs/HANDOFF.md` §7).

### `DEMO-5` — Dropdowns where the answer is from a known set

The apprenticeship signup form is mostly free text where it should be structured. From the client's
screenshot, the form holds: Date of birth, Mobile phone, Preferred language, Street address, City,
State, ZIP code, Employment status, Unemployment insurance status, Training/apprenticeship interest.
Employment status and Unemployment insurance status are already dropdowns.

### `DEMO-6` — Prefilled and dependent values

Less typing for a non-technical applicant: prefill the US dialling code on Mobile phone, and
evaluate — not assume — whether ZIP can become a dependent dropdown filtered by the city/state
already entered, given the product is US-only.

**Needs a decision** on a US city/state→ZIP data source (bundled dataset vs. third-party API vs.
validate-only), with cost and maintenance consequences. Note that one city can map to dozens of
ZIPs, so a filtered list may not be the improvement it first appears for large cities. Options to be
rated before anything is chosen.

Related existing data: `WorkforceJurisdiction` already holds `zip`/`city`/`county` rows, but only as
a ZIP→board routing table — `prisma/schema.prisma:497` records it as ZIP-only lookup for the
prototype, with no city/county fallback.

### `DEMO-7` — Funding amounts as USD

Funding amounts must be entered, calculated and displayed as US dollars.

**Needs detail:** amounts already exist in the model (`requestedAmount`, `approvedAmount`) and
aggregate on the Reports page, so it is not yet established whether what the client saw was missing
currency formatting, a broken calculation, or a missing input. The specific screen from the demo
would settle it.

---

## Order of work

1. `DEMO-1` + `DEMO-2` + `DEMO-3` — one screen, one unit of work, planned together.
2. `DEMO-4` — staying on the learner-page side of the notifications boundary.
3. `DEMO-5` / `DEMO-6` / `DEMO-7` — different screen, different user.

Each is planned with rated options (the client asked for comparison against established SaaS
practice; Salesforce references to be supplied for the UI work) and approved before any build.
