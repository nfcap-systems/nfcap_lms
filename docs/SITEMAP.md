# NFCAP LMS — Sitemap

**Status: FILLED by gate NFCAP-3, task 3.1 (2026-11-18). Awaiting approval on the Plane gate ticket.**
Route inventory is read from `src/app/` on branch `feature/phase-0-quality-foundations`; status
(`exists` / `extend` / `new`) is audited against it in task 3.2 and mirrored in
`docs/MOCKUP-INDEX.md`. ⚠️ The roadmap says "compared with the code on `stage`" — `stage` was not
diffed here (see **Findings**, F0).

This file is **authoritative** for the map of the product: every route, what screen it shows, which
board draws it, which ticket builds it, which plan phase it belongs to, and which roles see it.

Authority order (`docs/DEV-APPROACH.md`):
`ticket acceptance criteria > board > SITEMAP > build plan`.

## Inventory

**43 route files**: 41 pages + 2 route handlers (`/api/cron/data-retention`, `/auth/confirm`).
39 `loading.tsx` files exist (every page segment is covered; `CLAUDE.md`'s "31" is stale); root `error.tsx` exists. No `not-found.tsx` anywhere.
No route groups. Dynamic segments: `[courseId]` (learner, admin), `[learnerId]`, `[boardId]`,
`[caseId]` (coordinator, partner).

**Role confinement** (`src/proxy.ts`, `src/lib/roles.ts`): each role owns exactly one prefix and is
redirected home from any other. No cross-role access.

| Role | Prefix | Shell |
| --- | --- | --- |
| Learner | `/learner` | `LearnerShell` (top header nav) |
| Admin | `/admin` | `AppSidebar` + `AdminHeader` (sidebar) |
| WIOA Coordinator | `/coordinator` | `AppShell` |
| Partner Staff | `/partner` | `AppShell` |

Public: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy`,
`/auth/confirm`. Signed-in users hitting `/`, `/login` or `/signup` are redirected to their role home.

## Routes

**Ticket** column: only the gate tickets are known here — Plane was not read for this task. Feature
tickets are mapped when each ticket is started. **Board** `—` = no board in the 92-board plan (see
Findings). Phase = plan phase that built or will build/extend it.

### Public and auth

| Route | Screen | Board | Ticket | Phase | Roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Redirect: `/login` (signed out) or role home | — | — | — | Public | exists |
| `/login` | Sign in | — (F2) | — | 2 | Public | exists |
| `/signup` | Create account + short profile (name, DOB, phone, address, employment, UI status; WIOA fields conditional) | `LRN12-SignUp` | — | 2 | Public | exists |
| `/forgot-password` | Request reset email | — (F2) | — | 2 | Public | exists |
| `/reset-password` | Set new password after email link | — (F2) | — | 2 | Public (recovery session) | exists |
| `/auth/confirm` | Route handler — verifies Supabase `token_hash` (recovery, signup) and redirects | n/a | — | 2 | Public | exists |
| `/terms` | Terms of Service | — (F2) | — | 1 | Public | exists |
| `/privacy` | Privacy Policy | — (F2) | — | 1 | Public | exists |
| `/api/cron/data-retention` | Route handler — scheduled retention sweep, `CRON_SECRET` auth | n/a | — | 1 | System | exists |

### Learner (`/learner`)

| Route | Screen | Board | Ticket | Phase | Roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/learner` | Home — pathway shelf, continue, credentials | `LRN01-Home` | — | core | Learner | exists |
| `/learner/explore` | Course Catalog | `LRN13-OpenCourseEnrol` ⚠️ Q1 | — | core | Learner | exists |
| `/learner/my-learning` | My Learning — enrolled courses | `LRN02-Pathway` ⚠️ Q2 | — | core | Learner | exists |
| `/learner/courses/[courseId]` | Course page: lesson player + sidebar, **Quiz** and **Practical Evidence** as in-page views (`CourseLearningView`, `QuizView`, `EvidenceView`) — not separate routes | `LRN03`, `LRN04`, `LRN04b`, `LRN05*`, `LRN06*` | — | core → 3, 6 | Learner | extend |
| `/learner/portfolio` | Portfolio | `LRN07-Portfolio` | — | core → 3/4 | Learner | extend |
| `/learner/certificates` | Certificates (on-screen only, no PDF) | `LRN08-Certificates` | — | core → 4 | Learner | extend |
| `/learner/funding` | WIOA Funding — board match, outreach, documents, status | `LRN10-FundingStatus`, `LRN10c-DocumentChecklist` | — | 0 → 5 | Learner | extend |
| `/learner/profile` | Profile (per handoff: "still needs real content") | — (F4) | — | core | Learner | exists |
| `/learner/account` | Account Settings — name, email, password, contact info (reauth-gated) | `LRN11-Account` | — | 2 | Learner | exists |

### Admin (`/admin`)

| Route | Screen | Board | Ticket | Phase | Roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin` | Dashboard (academy-shaped `DashboardView`; being **replaced** by `/dashboard/default` structure) | `ADM02-Dashboard` | — | core → 1/6 | Admin | extend |
| `/admin/courses` | Courses list | `ADM05-Courses` | — | core | Admin | exists |
| `/admin/courses/[courseId]` | Course detail + curriculum builder | `ADM06-CurriculumBuilder`, `ADM07-CriteriaAuthoring` | — | 1/3/7 | Admin | extend |
| `/admin/pathway` | Pathway list | `ADM08-Pathway` | — | 1 | Admin | exists |
| `/admin/pathway/apprenticeship` | Pathway detail + reorder | `ADM08-Pathway` | — | 1, 7 (keyboard reorder) | Admin | extend |
| `/admin/learners` | Learner roster | `ADM03-Learners` | — | core | Admin | exists |
| `/admin/learners/[learnerId]` | Learner detail / profile | `ADM04-LearnerDetail` | — | core | Admin | exists |
| `/admin/roles` | Role Management — assign role, deactivate/reactivate | `ADM17-Roles` | — | 2 | Admin | exists |
| `/admin/audit` | Audit Log | `ADM16-Audit` | — | 1 | Admin | exists |
| `/admin/account` | Account Settings | — (F3) | — | 2 | Admin | exists |
| `/admin/analytics` | **Placeholder** (`AdminPlaceholderScreen`, "Future") | `RPT01-AdminReporting` | — | 1/6 | Admin | new (placeholder only) |
| `/admin/settings` | **Placeholder** (`AdminPlaceholderScreen`, "Future") | `SET01-AdminSettings` | — | — | Admin | new (placeholder only) |
| `/admin/wioa/boards` | Workforce Boards | `WIOA01-Boards` | — | 0/5 | Admin | exists |
| `/admin/wioa/boards/[boardId]` | Board detail (contents not inspected in 3.1) | `WIOA02-BoardDetail` | — | 0/5 | Admin | exists |
| `/admin/wioa/document-requirements` | Document checklist per board | `WIOA03-DocumentRequirements` | — | 5 | Admin | exists |
| `/admin/wioa/email-template` | Outreach email template | `WIOA04-EmailTemplate` | — | 5 | Admin | exists |
| `/admin/wioa/reports` | WIOA Reports | `RPT02-FundingImpact` | — | 5 | Admin | extend |

### WIOA Coordinator (`/coordinator`)

| Route | Screen | Board | Ticket | Phase | Roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/coordinator` | All Cases | `CRD01-CaseList` | — | 0 → 5 | Coordinator | extend |
| `/coordinator/[caseId]` | Case detail — documents, status, milestones | `CRD02-CaseDetail`, `CRD03-DocumentReview`, `CRD04-StatusRecording` | — | 0 → 5 | Coordinator | extend |
| `/coordinator/reports` | Reports | `RPT02-FundingImpact` ⚠️ F5 | — | 5 | Coordinator | extend |
| `/coordinator/account` | Account Settings | — (F3) | — | 2 | Coordinator | exists |

### Partner Staff (`/partner`)

| Route | Screen | Board | Ticket | Phase | Roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/partner` | My Cases (assigned only) | `PTN01-Roster` | — | 0 → 5 | Partner Staff | extend |
| `/partner/[caseId]` | Case detail (no funding amounts) | `PTN02-LearnerDetail` | — | 0 → 5 | Partner Staff | extend |
| `/partner/reports` | Reports | — (F5) | — | 5 | Partner Staff | exists |
| `/partner/account` | Account Settings | — (F3) | — | 2 | Partner Staff | exists |

## Planned screens with no route yet

These have a feature in the build plan and a board in the 92-board list, but **no route exists**.
They are not invented rows — they are plan features that will need a route when built.

| Planned screen | Board | Phase | Feature (build plan) | Roles | Status |
| --- | --- | --- | --- | --- | --- |
| Evidence criteria list / guided capture / not-met / resubmit / attempt history | `LRN06`–`LRN06f` | 3 | Guided Evidence Capture; Per-Criterion Feedback & Targeted Resubmission; Attempt History | Learner | new (replaces whole-course free-text `EvidenceView`) |
| Quiz start / question / result | `LRN05`–`LRN05c` | 6 | Quiz Engine Depth | Learner | extend (`QuizView` exists in-page) |
| Public certificate verification | `LRN09-PublicVerify` | 4 | Public Verification Page + QR Code | **Public** | new (first public non-auth page beyond legal) |
| Eligibility self-check | `LRN10b-EligibilitySelfCheck` | 5 | Eligibility Self-Check | Learner (pre-signup?) | new |
| Reviewer queue | `ADM10-ReviewQueue` | 3 | Reviewer Queue | Admin | **exists** — `/admin/reviews`, PR #18 (board ID corrected 2026-11-27: was `ADM08-ReviewQueue`, renamed in the 2026-11-20 board resequencing) |
| Per-criterion review | `ADM11-PerCriterionReview` | 3 | Per-Criterion Review & Gated Certification | Admin | **exists** — `/admin/learners/[learnerId]/review/[courseId]`, PR #19 (board ID corrected 2026-11-27: was `ADM09-PerCriterionReview`) |
| Photo annotation | `ADM12-PhotoAnnotation` | 3 | Photo Annotation | Admin | **exists** — inside the review screen above, PR #20 (board ID corrected 2026-11-27: was `ADM10-PhotoAnnotation`) |
| Cohorts | `ADM13-Cohorts` | 6 | Cohorts & Deadlines | Admin | **exists** — `/admin/cohorts`, PR #32, 2026-11-26 (board ID corrected 2026-11-27: was `ADM12-Cohorts`) |
| Stalled cases | `CRD05-StalledCases` | 5 | Stalled-Case Detection & Follow-Up | Coordinator | new |

## Findings

Reported, not resolved. None were added to the table as invented rows.

**F0. `stage` was not diffed.** `git` has the dubious-ownership problem noted in `CLAUDE.md`, and the
working tree is a feature branch with many uncommitted changes. Status above is read from the working
tree. Confirm against `stage` before approval.

**Routes with no board in the 92 (and none planned):**

- **F1. `/` redirect and the 404 / error states** — no `not-found.tsx` exists; `error.tsx` does. Covered at best by `FND10-EmptyErrorLoading`.
- **F2. Auth and legal screens:** `/login`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy` have no board. Only `LRN12-SignUp` does. Phase 2 built password reset and email verification, so a board for each (and the "check your email" / "link expired" states) is missing.
- **F3. Account Settings for Admin, Coordinator, Partner** (`/{role}/account`) — only `LRN11-Account` exists. Same screen in four shells; probably one board plus a note, but that is a decision.
- **F4. `/learner/profile` vs `/learner/account`** — two screens for one person; no board for Profile. Overlap should be decided before `LRN11`.
- **F5. `/coordinator/reports` and `/partner/reports`** — `RPT02-FundingImpact` is the only reports board for four report routes (admin WIOA, coordinator, partner). Partner reports have no board.

**Features with no route and no board** (all Phase 6, all in the build plan, none in the 92):

- **F6. Trainee ↔ Staff Messaging** (36h), **Announcements** (14h), **Notification Coverage Completion** (18h), **Bulk / CSV Enrollment** (18h), **Data Export** (14h), and the admin side of **Quiz Engine Depth** (question banks, attempt limits). That is ~100h+ of plan scope with zero boards. If the roadmap's goal is "one board per screen", the count is understated.
- **F7. Phase 4 features** *Expiry & Renewal Reminders*, *Shareable Verified Portfolio* — conditional on open question 6; boards `LRN07`/`LRN08` cover the shell only.
- **F8. Phase 7 accessibility** has no screens but changes dialogs/drawers (`FND09`) and drag-reorder (`ADM11`) — covered by `FND12`.

**Routes with no feature behind them:**

- **F9. `/admin/analytics` and `/admin/settings`** are placeholders labelled "Future". Analytics maps loosely to Phase 1/6 Reporting; **Settings has no feature in the 65**. `SET01-AdminSettings` therefore draws a screen the plan doesn't scope — per DEV-APPROACH this is a Plane ticket for Manjila, not a silent board.
- **F10. `/learner/explore`** — Course Catalog. Plan step 6 has an open-course path (open question 1), so it may stay, but it is not named in the plan.

**Phase mismatches against the roadmap's provisional list:**

- **F11. `ADM16-Audit` and `ADM17-Roles`** (board IDs corrected 2026-11-27 — the 2026-11-20 board
  resequencing in `docs/MOCKUP-INDEX.md` renamed these from `ADM13-Audit`/`ADM14-Roles`; this file
  never picked up the rename) are marked Phase 1 / 2 in the roadmap and are **built** (`exists`).
  `WIOA01/02` are Phase 0/5; the code is Phase 0 (`exists`), with Phase 5 extending.
- **F12. `LRN12-SignUp`** is built (Phase 2); step 1 "short profile" fields match the plan (verified: DOB, phone, address, employment, UI status present).

## Journeys

Numbered `J1…`. J1–J10 are the build plan §2 ten steps; J11–J14 are the per-role journeys
DEV-APPROACH gate NFCAP-5 requires. Screens are routes; ⛔ = no route yet.

| # | Journey | Role | Screens, in order | Board |
| --- | --- | --- | --- | --- |
| J1 | Sign up | Learner | `/signup` → `/auth/confirm` (verify email) → `/learner` | `JRN01` |
| J2 | Match board | Learner (automatic) | `/signup` (address) → `/learner/funding` (matched board) · unmatched: `/admin/wioa/boards` resolves by hand | `JRN02` |
| J3 | Outreach and documents | Learner, Partner Staff | `/learner/funding` (review + send email, upload per checklist) → `/partner/[caseId]` (accept / reject / ask resubmit) | `JRN03` |
| J4 | Eligibility review | Coordinator / Partner | `/coordinator/[caseId]` (record each status) ⇄ `/learner/funding` (status visible) | `JRN04` |
| J5 | Funding approved | Coordinator | `/coordinator/[caseId]` (milestone chain → tuition approved) → course unlocks on `/learner/my-learning` | `JRN05` |
| J6 | Enrolled | Learner | `/learner/explore` or unlock → `/learner/my-learning` | `JRN06` |
| J7 | Lessons and quiz | Learner | `/learner/courses/[courseId]` (lessons → quiz, in page) | `JRN07` |
| J8 | Practical evidence | Learner | `/learner/courses/[courseId]` (today: free-text) · ⛔ per-criterion capture | `JRN08` |
| J9 | Admin review | Admin | ⛔ reviewer queue → ⛔ per-criterion review → ⛔ annotation | `JRN09` |
| J10 | Certificate | Learner, public | `/learner/certificates` · ⛔ public verify | `JRN10` |
| J11 | Evidence loop | Learner | ⛔ capture → ⛔ review → ⛔ re-shoot only failures | `JRN11` |
| J12 | Review loop | Admin | ⛔ queue → ⛔ review → ⛔ certificate gate | `JRN12` |
| J13 | Admin day-to-day | Admin | `/admin` → `/admin/courses/[courseId]` → `/admin/learners/[learnerId]` → `/admin/roles` | — (gap: no admin-ops journey board) |
| J14 | Coordinator / partner day-to-day | Coordinator, Partner | `/coordinator` → `/coordinator/[caseId]` · `/partner` → `/partner/[caseId]` → reports | — (gap: covered only by J3–J5) |

**Gap:** DEV-APPROACH requires one journey per role — learner, admin, coordinator, partner staff,
plus WIOA flow. The roadmap's `JRN01`–`JRN12` cover learner, funding and the admin *review* loop.
**No board exists for a general admin journey (J13) or a partner-staff journey (J14).**

## Rules

Numbered `R1…`. Cross-cutting behaviour that is not a screen: gating, access, state transitions.

| # | Rule | Source |
| --- | --- | --- |
| R1 | A funded course stays locked until tuition is approved. Open courses never touch the funding process. | Build plan §2, "the rule that matters most" |
| R2 | A certificate cannot be issued unless every required criterion is Met. | Build plan Phase 3 |
| R3 | No screen stores or displays a Social Security number. | Build plan Phase 1, No-SSN rule |
| R4 | Partner Staff see only their assigned trainees, and never funding amounts. | Build plan §3 |
| R5 | A rejected trainee re-shoots only the criteria that failed, not the whole submission. | Build plan Phase 3 |
| R6 | Each role is confined to one route prefix; signed-in users are redirected from `/`, `/login`, `/signup` to their role home, and from another role's prefix to their own. | `src/proxy.ts`, `src/lib/roles.ts` |
| R7 | A deactivated user (Supabase `ban_duration`) cannot sign in; nothing is deleted. | Phase 2, `docs/build/PHASE_2_PROGRESS.md` |
| R8 | Changing name, email or password on Account Settings requires re-authentication. | Phase 2 |
| R9 | Sessions are capped at 30 days (`httpOnly`/`secure`/`sameSite`). | Phase 2, `src/lib/supabase/session.ts` |
| R10 | Real WIOA data cannot enter the system until the Workforce Board Data Agreement is signed. | Build plan Phase 8 hard gate |
| R11 | Evidence must be captured for every required criterion before submission is possible. | Build plan Phase 3 |
| R12 | Every screen needs phone, empty, error and permission states drawn up front. | `docs/DEV-APPROACH.md` gate 4 |
