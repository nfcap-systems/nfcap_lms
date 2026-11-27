# Admin UI parity — plan

Written 2026-11-23. Tracks retrofitting the remaining old-UI Admin screens (`admin-ui`/shadcn
library) to the new design system (`@/components/ui` + `src/app/design-system.css`/`nfcap.css`
tokens). **Not part of the approved 65-feature build plan and not Phase 3 scope** — a separate
workstream the user asked for after noticing most of Admin still looked like the old library
despite Phase 3 and the design-system migration both being underway. `docs/plans/phase-3-and-
design-migration-kickoff.md` is Phase 3's plan and is not the source of truth for this work.

## Scope boundary — do not touch

- **Reopened 2026-11-24, then built:** `src/app/admin/courses/[courseId]` and
  `src/components/admin/CurriculumBuilderView.tsx` were listed here as deferred (active Phase 3
  churn risk) — the user explicitly asked for them built now regardless. See the ADM06/ADM07
  detail section below for what changed and how the churn risk was handled (pure presentation
  swap, zero action/data-layer diff, verified).
- `src/app/admin/layout.tsx`, `src/components/admin-shell/AdminHeader.tsx`/`NavUser.tsx`/
  quick-create dialogs/`AdminPlaceholderScreen` — shared shell chrome not covered by the
  correction below.

**Reopened 2026-11-23:** `AppSidebar.tsx`/`NavMain.tsx` were listed here as "already judged
complete" from Step 1.4 of the design-system migration ("already matches via globals.css's own
sidebar/primary oklch theme block") — that earlier judgment was about color tokens only, not
structural/content parity with `Sidebar.dc.html`. The user compared the live Dashboard against the
mockup and asked for the sidebar fixed directly, so this scope boundary no longer applies to those
two files — see the Dashboard, Learners, Audit Log batch detail below for what changed.
- `src/components/admin/LearnerProfileView.tsx` and `/admin/learners/[learnerId]` — not in any
  batch below. Phase 3 Feature #7 lightly touched this file (17 lines) to route to the new
  per-criterion review screen; that doesn't bring it into this workstream's scope. Adding it is a
  scope decision to confirm with the user, not something to do unilaterally.

## Already built fresh against the new system (not a retrofit target)

- `src/components/admin/CriterionReviewView.tsx` (`ADM11-PerCriterionReview`, Phase 3 Feature #7)
  — confirm via imports before assuming it needs work, but it almost certainly doesn't.
- WIOA Reports (`src/components/wioa/WioaReportsView.tsx`) — retrofitted in Step 1.4 of the
  design-system migration.

## Confirmed current state

Original table below is from the 2026-11-23 research pass and is **stale** — re-verified
2026-11-24 by grepping each file's actual `@/components/admin-ui` imports directly, not by
re-trusting this table. Corrections inline.

| Route | Component (lines) | Old library usage |
| --- | --- | --- |
| `/admin` | `DashboardView.tsx` (389) | admin-ui badge/card + Recharts (`src/components/admin-ui/chart.tsx`) — only chart usage in the codebase; no new-system chart pattern exists yet |
| `/admin/courses` (list) | `AdminCoursesView.tsx` (289) | **Stale — retrofitted as of 2026-11-24, zero `admin-ui` imports.** |
| `/admin/learners` | `LearnersRosterView.tsx` (264) | admin-ui avatar/badge/button/input/select/table |
| `/admin/pathway` | `PathwayDetailView.tsx` (moved from `/apprenticeship`, 102) | **Route collapsed 2026-11-24 — `PathwayListView.tsx` deleted, zero `admin-ui` imports remain.** See Batch B detail below. |
| `/admin/roles` | `RoleManagementTable.tsx` (145) | **Stale — retrofitted as of 2026-11-24, zero `admin-ui` imports.** |
| `/admin/audit` | `AuditLogView.tsx` (293) | admin-ui badge/button/input/select/table |
| `/admin/settings` | 11-line placeholder (`AdminPlaceholderScreen`) | trivial — not worth a dedicated pass, fold in if convenient or skip |
| `/admin/wioa/boards` | `BoardsAdminView.tsx` | **Retrofitted 2026-11-24, zero `admin-ui` imports.** See Batch C detail below. |
| `/admin/wioa/document-requirements` | `DocumentRequirementsAdminView.tsx` | **Retrofitted 2026-11-24, zero `admin-ui` imports.** See Batch C detail below. |
| `/admin/wioa/email-template` | `WioaEmailTemplateAdminView.tsx` | **Retrofitted 2026-11-24, zero `admin-ui` imports.** See Batch C detail below. |
| `/admin/courses/[courseId]` | `CurriculumBuilderView.tsx` | **Retrofitted 2026-11-24** (scope boundary reopened — see above). Zero `admin-ui` imports. See ADM06/ADM07 detail below. |

## Board file layers — pull apart, don't treat as one spec

Every `.dc.html` board carries three layers:

1. `<link rel="stylesheet" href="nfcap.css">` — shared, already ported into
   `src/app/design-system.css`. Reuse existing classes, don't recreate them.
2. `<dc-import name="Sidebar" active-nav="...">` — shared shell, maps to
   `AppSidebar.tsx`/`AdminHeader.tsx`. Already judged complete (see scope boundary above). Don't
   rebuild or nitpick the sidebar per board.
3. The board's own local `<style>` block — the only genuinely new per-screen work. When a local
   style looks repeatable across boards in this workstream, promote it to a shared class in
   `design-system.css` (same precedent as Feature #6 promoting `ADM10-ReviewQueue`'s local
   `.toolbar`/`.chip` into shared classes) instead of leaving it board-local.

## Reusable precedent — follow, don't reinvent

- `DataTableCard`/`DataTableCardHeader`/`DataTableFilters`/`Pagination`
  (`src/components/ui/DataTableCard.tsx`) for every list screen; `.data-table`/`.table-footer`/
  `.dt-footer`/`.mcard`/`.chip`/`.toolbar` already in `design-system.css`.
- `StateCard` (`@/components/ui`) for empty states.
- `Dialog`/`Field`/`Input`/`Textarea` (`@/components/ui`) for forms — see
  `PartnerRosterView.tsx`'s `AddNoteDialog` for the exact pattern.
- `Icon` (`@/components/icons`) — check the existing `IconName` list before adding a new icon.
- Visual-compare every retrofit against its board on the design canvas
  (`https://claude.ai/artifact/6othp9hKDpwXeLJsWtkt3Y`, `list scope:"files"` then
  `read path:"project/<BoardName>.dc.html"`) — same standard as every other retrofit this project
  (`docs/MOCKUP-INDEX.md`'s "three mistakes" note: "close enough" doesn't count).

Boards: `ADM02-Dashboard`/`ADM02b-DashboardCollapsed`, `ADM05-Courses`, `ADM03-Learners` (the
canonical `.dtcard` reference per `docs/MOCKUP-INDEX.md` line 260), `ADM08-Pathway`,
`ADM17-Roles`, `ADM16-Audit`, `WIOA01-Boards`, `WIOA03-DocumentRequirements`,
`WIOA04-EmailTemplate`.

## Batches — run sequentially, one branch/PR each

1. **Batch A** — Dashboard + Learners roster + Audit Log.
   Branch `feature/admin-ui-parity-dashboard-learners-audit` → PR "Admin UI parity: Dashboard,
   Learners, Audit Log" → `stage`.
2. **Batch B** — Courses list + Pathway (list + detail) + Roles (+ Settings placeholder if
   convenient).
   Branch `feature/admin-ui-parity-courses-pathway-roles` → PR "Admin UI parity: Courses, Pathway,
   Roles" → `stage`.
3. **Batch C** — WIOA admin trio (Boards, Document Requirements, Email Template).
   Branch `feature/admin-ui-parity-wioa-admin` → PR "Admin UI parity: WIOA Boards, Documents,
   Email Template" → `stage`.

## Process rules (same as every other branch of work this project)

- Flag the user before any commit or push, every time.
- Verify `git status` shows exactly the intended files before committing — don't trust a
  pre-existing staged index blindly.
- Leave unrelated uncommitted changes in the working tree alone.
- CI green alone is not merge approval by default — wait for the user's own UI pass unless they
  say otherwise for that PR.
- No local Docker Postgres — rely on CI for `npm test`/`npm run test:e2e`.
- Never run `npm run build` while a dev server is live against this directory (check
  `netstat -ano | grep LISTENING | grep ":3000"` first); verify visually via Playwright instead
  (`admin@demo.nfcap.test` / `admin12345`, not `Demo1234!`).
- `git config --global --add safe.directory C:/Users/sthas/Projects/nfcap_lms` first.

## Progress log (update as each batch finishes)

**Reconciled 2026-11-27:** all four "not pushed" rows below were verified merged to `stage` via
PR #24 (merge commit `66df6d5`, 2026-11-24) — same branch, same staleness pattern found across
`CLAUDE.md`, `wioa-spec-alignment-kickoff.md`, `PHASE_5_PROGRESS.md` and `mockup-complete-build.md`
in the same pass. Visual-pass-owed caveats are left as-is; only the push/merge status was wrong.

| Batch | Branch | PR / merge commit | State | Date |
| --- | --- | --- | --- | --- |
| A — Dashboard, Learners, Audit Log | `feature/admin-ui-parity-dashboard-learners-audit` | commit `26e4a22`, merged to `stage` via PR #24 (`66df6d5`) | Committed; later commits piled on top. Visual pass still owed by the user. | 2026-11-23 |
| B — Courses, Pathway, Roles | `feature/admin-ui-parity-dashboard-learners-audit` | merged to `stage` via PR #24 (`66df6d5`) | **Closed 2026-11-24.** Courses, Pathway (collapsed to one route), and Roles all confirmed retrofitted — zero `admin-ui` imports. Settings placeholder left untouched (trivial, optional per this doc). Visual pass against the boards still owed by the user. | 2026-11-24 |
| C — WIOA admin trio | `feature/admin-ui-parity-dashboard-learners-audit` | merged to `stage` via PR #24 (`66df6d5`) | **Closed 2026-11-24.** Boards, Document Requirements, Email Template all retrofitted — zero `admin-ui` imports. See Batch C detail below. | 2026-11-24 |
| ADM06/ADM07 — Curriculum Builder + Criteria Authoring | `feature/admin-ui-parity-dashboard-learners-audit` | merged to `stage` via PR #24 (`66df6d5`) | **Not an original batch — added 2026-11-24 at the user's explicit request to drop the "deferred" scope boundary and build it now.** See detail below. | 2026-11-24 |

### Batch A detail

Retrofitted `src/app/admin/DashboardView.tsx`, `src/app/admin/learners/LearnersRosterView.tsx`,
`src/app/admin/audit/AuditLogView.tsx` off `admin-ui`/shadcn onto `@/components/ui` +
`design-system.css`, matching `ADM02-Dashboard`/`ADM02b-DashboardCollapsed`, `ADM03-Learners`,
`ADM16-Audit`. Trimmed `src/app/admin/learners/page.tsx` and `src/app/admin/audit/page.tsx` of
their own duplicate `<h1>`/`<p>` header markup since each view now renders its own `.pagehdr`.

Ported into `design-system.css` (existed in `nfcap.css` but hadn't been needed yet):
`.trend`, `.sched-row`/`.sched-left`/`.sched-bar`/`.sched-time`/`.sched-mid` (Dashboard's Needs
Review list), `.badge-sq`, `.av-dot`, and the `--chart-approved`/`--chart-pending`/
`--chart-rejected` muted chart palette tokens — this is the first screen in the codebase to need
chart tokens. Added a `download` icon to `src/components/icons.tsx` (Audit Log's CSV export
button; didn't exist in the `IconName` set).

Dashboard keeps Recharts (`src/components/admin-ui/chart.tsx` — generic plumbing, not itself an
old-theme visual component, so it stays) but now feeds it the new `--chart-*` tokens instead of
hardcoded hex/`var(--primary)`. Deliberately dropped the board's "Add Learner" button — signup is
self-serve, no such admin action exists, and adding one is out of this workstream's scope. Needs
Review got a real upgrade over the old flat "Pending" badge: `.sched-bar`/`.badge-sq` color now
reflects real urgency computed from `evidence.submittedAt` (red ≥3 days, yellow ≥1 day, green
same-day) — same pattern as the board's red/yellow/green but driven by real dates, not fabricated.

**Correction, same session:** the first pass of this batch also dropped the trend badges, the
weekly evidence chart (replaced with a per-course view), the Recent Learners table, and the
Upcoming WIOA Appointments panel, on the reasoning that no real data backed them. The user asked
for exact mockup-structure parity instead, so all four were rebuilt with real data:
- **Trend badges** — real month-over-month deltas (`learners.length`/`enrolledNow` now vs the
  count whose real `createdAt`/`enrolledAt` was already ≥30 days old). Pending Reviews and Active
  Learner Rate have no honest 30-days-ago basis (no status-history table, "active" is a lifetime
  flag not a point-in-time state) — those two render a neutral `—` badge instead of a fabricated
  percentage, not silently faked.
- **Evidence submissions by week chart** — rebuilt as a real 4-week grouped bar chart (approved/
  pending/rejected) from evidence `submittedAt` timestamps, matching the board. The Today/7d/30d
  segmented toggle is visually wired but only "7d" has real data behind it this batch; the other
  two buttons are inert, flagged here rather than faked.
- **Recent Learners table** — real data from the same `learners`/`progressByLearner`/`courses`
  props already on this page: name, most-recently-active course (by real enrollment/evidence/quiz
  timestamp), real progress badge, real relative last-activity time.
- **Upcoming WIOA Appointments** — there is a real `Appointment` model (`prisma/schema.prisma:546`,
  linked to `WioaCase`). New `getUpcomingWioaAppointments` query in `src/lib/data/wioa.ts` (soonest
  4 across every case, not fetched before on this page). **Fixed during review** (not by the
  building agent): the first version of this query resolved each appointment's learner name with a
  `getLearnerById` call inside a loop — a per-entity-query-in-a-loop, against CLAUDE.md's
  performance conventions. Changed to return `learnerId` only and resolve the name client-side in
  `DashboardView` from the `learners` roster the page already fetches for its other panels — zero
  extra queries instead of up to 4.
- `src/app/admin/page.tsx` now also calls `requireAdmin()` (for the appointments query's RLS
  context) and fetches `upcomingAppointments` alongside the existing `courses`/`learners`/
  `progressByLearner` calls, in the same `Promise.all`.

One known real-data gap flagged, not hidden: `CourseProgress.completedLessonIds` is just an id
array with no timestamp (lesson-completion events do have a real `completedAt` in
`CompletedLesson`, just not surfaced on this type) — so "last activity" for a learner whose only
activity is lesson completion (no enrollment/evidence/quiz event since) can undercount how recent
that activity actually was. Not fixed this batch; flagged for anyone touching `CourseProgress`
next.

Learners roster dropped the board's "Pathway / Cohort" column and "Funded (WIOA)" KPI tile — no
cohort field exists in the schema (`LearnerRecord` is just `{ id, name, email }`) and no WIOA data
is fetched on this page; fabricating either would violate the same honesty standard flagged
in the kickoff doc's other retrofits. `.av-dot` only shows for learners who've actually started a
course (real signal) rather than the board's three-tier recency dots (no last-activity timestamp
exists to back "active this week" vs "stale"). Sorting (previously via `@tanstack/react-table`) was
dropped in favor of the same plain-array + `DataTableCard`/`Pagination` pattern already established
by `PartnerRosterView.tsx` and `WioaCaseListView.tsx` — consistent with how every other retrofitted
list screen in the app now works, not just a one-off simplification.

Audit Log kept its existing real functionality (search, CSV export, expandable per-row JSON
metadata detail) and added one genuinely new real feature matching the board: an "Any action
type" filter select, built from the distinct `action` values already present in the fetched
entries (no new data fetch). Did not add the board's "Last 7 days" date-range filter — no backing
UI/data decision was made for it this batch; flagged here rather than silently dropped, in case a
later batch or user review wants it added.

**Verification: visual check (Playwright against the demo admin login) was explicitly skipped this
batch by the user's own instruction, mid-session** — they will do their own manual browser pass
instead. So: `npm run lint` is clean on all changed `.ts`/`.tsx` files (Dashboard, Learners, Audit
Log, their `page.tsx` files, `src/lib/data/wioa.ts`/`learners.ts`/`progress.ts`), `npx tsc --noEmit`
is clean project-wide. `npm run build` was **not run** — a `next dev` server was already live on
port 3000 (not started this session, likely the user's own, needed for their upcoming manual
verification pass) and `CLAUDE.local.md` #2 is explicit that running a production build against a
live dev server corrupts `.next/dev/types/*` with phantom `tsc` errors; killing someone else's live
dev server to free the port wasn't judged worth that risk given the user is about to use it
themselves. Needs a `npm run build` pass once the dev server isn't contending for `.next/`, before
this is treated as fully verified. Not committed or pushed — branch
`feature/admin-ui-parity-dashboard-learners-audit` holds the changes locally.

**Process note:** the Dashboard correction above was originally delegated to a background agent;
the user asked to stop background delegation and continue directly in-session partway through, so
it was stopped mid-task (after lint/tsc had just come back clean, before it updated this doc) and
the remaining work — the per-entity-loop fix, this doc update, and verification — was finished
directly in the main session instead.

### Batch B detail

Courses (`AdminCoursesView.tsx`) and Roles (`RoleManagementTable.tsx`) were found already
retrofitted when re-verified 2026-11-24 (zero `admin-ui` imports) — not redone this session, just
confirmed and logged here for the first time.

**Pathway route collapse (the one real Batch B change made this session):** `ADM08-Pathway`
(`docs/MOCKUP-INDEX.md` line 744) covers both `/admin/pathway` and `/apprenticeship` as a **single**
board — there is no separate "list of pathways" screen in the board set. The pre-existing code had
`/admin/pathway` render a clickable summary card (`PathwayListView.tsx`, old `admin-ui` badge/card,
matched no board) that routed into `/admin/pathway/apprenticeship` for the real mcard+reorder view
(`PathwayDetailView.tsx`, already retrofitted, matches the board closely). Since NFCAP runs exactly
one pathway (`PRODUCT_CONTEXT.md` Section 5), confirmed with the user to collapse this into one
page rather than retheme a screen with no board behind it:
- `/admin/pathway/page.tsx` now renders `PathwayDetailView` directly (moved from
  `apprenticeship/page.tsx`).
- `PathwayDetailView.tsx` and its richer `loading.tsx` skeleton moved up from
  `pathway/apprenticeship/` to `pathway/`.
- `PathwayListView.tsx` and the entire `pathway/apprenticeship/` directory deleted — confirmed
  nothing else in `src/` referenced `/apprenticeship` before removing it.

**Access-toggle UI fixed during the same pass**, found via the user's own screenshots of
`PathwayView.tsx`'s per-course row control, three iterations:
1. Original: a plain checkbox for "Restricted" next to a non-interactive-looking flat badge for
   "Open to all" (this matched `ADM08-Pathway`'s own markup exactly, so the board has the same
   inconsistency) — user flagged no visible toggle affordance on the open state.
2. First fix: one consistent pill-shaped switch control for both states (new `.access-toggle`/
   `.access-toggle-track`/`.access-toggle-thumb` classes) — user found this confusing in practice
   (screenshot showed every row's switch visually identical regardless of state at a glance) and
   asked for a plain button instead.
3. **Final:** reverted to `.btn-secondary.btn-sm` (same class already used by this page's "Preview
   as Learner" button), but the button label is the **current status** word ("Restricted" with a
   lock icon, or "Open to all"), not the next action — an early version showed the *next action*
   as the label (e.g. a restricted course's button read "Open to all", which reads like it's
   already open, not "click to open it") and was corrected after the user caught it. Final shape
   is two separate elements per row: a non-interactive `badge-neutral`/`badge-accent` status badge,
   plus a separate `.btn-secondary.btn-sm` action button labeled with what clicking it will do.
   The unused `.access-toggle*` CSS from step 2 was removed, not left dead in `design-system.css`.

Verified: `npx tsc --noEmit` clean project-wide and `npx eslint` clean on
`src/components/admin/PathwayView.tsx` after every iteration. Not yet visually verified in the
browser by the user as of this doc update.

### Batch C detail

Retrofitted all three WIOA admin screens off `admin-ui` onto `@/components/ui` + `design-system.css`,
matching `WIOA01-Boards`, `WIOA03-DocumentRequirements`, `WIOA04-EmailTemplate`. Ported each board's
local CSS into `design-system.css`: `.reqrow` (Document Requirements' per-row layout), `.wioa-cols`/
`.chip2` (Email Template's two-column layout and variable-token chip).

**BoardsAdminView** — real `.pagehdr` + per-board highlight panel grid + `DataTableCard` table. Added
two new real, batched data points to `src/lib/data/wioa-boards.ts`'s `getWorkforceBoards` to honestly
back the board's copy (not fabricated): `activeCaseCount` (one `groupBy` on `WioaCase`, not a
per-board loop query) and `primaryContactName` (one `distinct`-on query ordered by contact
`priority`) — both batched across every board in the same function, consistent with CLAUDE.md's
no-per-entity-loop convention. The "Add board" dialog (`NewWorkforceBoardDialog`) was left untouched
— shared quick-create chrome, out of this workstream's scope.

**DocumentRequirementsAdminView** — replaced the modal add/edit dialog with the board's real design:
an always-visible inline "Add / edit requirement" panel at the bottom of the page, no dialog.
Clicking "Edit" on a row populates the same inline form instead of opening a modal. Badge tone for
"Conditional" corrected to `neutral` (matching the board's `badge-neutral`, not an invented
amber/pending tone) after an initial pass used the wrong tone.

**WioaEmailTemplateAdminView** — same change in kind: dropped the separate view-card + edit-dialog
split for one always-editable inline form (Subject/Body with a "Save template" button in the
header), matching the board exactly.

All three: trimmed each `page.tsx`'s duplicate `<h1>`/`<p>` header now that the view renders its own
`.pagehdr` (same convention as every other batch).

### ADM06-CurriculumBuilder / ADM07-CriteriaAuthoring detail

**Not originally scoped** — `CurriculumBuilderView.tsx` was explicitly listed as deferred (active
Phase 3 churn risk: Feature #4 extended it, #8 Photo Annotation might too). The user asked to build
it now regardless and to stop deferring further.

**Risk mitigation, confirmed before editing:** grepped for every import of `CurriculumBuilderView`
and its internal sub-components (`CriteriaPanel`, `CriterionDialog`, `AssessmentPanel`, etc.) —
only its own `page.tsx` imports the exported component; nothing else in `src/` touches its internals.
This meant the retrofit could be a **pure presentation swap**: every server action call/signature,
type, and piece of state logic was kept byte-for-byte identical; only the UI primitive imports and
their JSX usage changed (admin-ui's compound `Dialog`/`Select`/`Checkbox`/`Badge` components →
`@/components/ui`'s simpler single-component APIs). Confirmed via `git diff --stat` on
`src/lib/actions/curriculum.ts`, `src/lib/actions/progress.ts` (the certification-gating file), and
`src/lib/data/courses.ts` — **zero diff** in any of them from this work.

**First pass (reverted):** pulled "Assessment Criteria" authoring out of the builder's rail
(previously an embedded panel + modal dialog) into a standalone route,
`/admin/courses/[courseId]/criteria`, to match `ADM07-CriteriaAuthoring`'s board layout (list +
inline edit panel, no modal — a real improvement over the old dialog). The user's own browser check
(`Screenshot 2026-11-24 142505.png`) confirmed this worked, but asked for it **not** to be a separate
page — "Assessment Criteria" should behave like every other rail item (General Information/Sections/
Knowledge Assessment): click it, the content area swaps in place, no navigation.

**Final shape:** folded the same list+inline-form UI back into `CurriculumBuilderView.tsx` as an
embedded `CriteriaPanel`/`CriterionForm`, restored the `'criteria'` `RailSelection` variant and the
`criteria` prop/fetch in `page.tsx`, and deleted the standalone route entirely (confirmed zero
remaining references anywhere in `src/` after removal). Kept the "Required for certification"
checkbox in the form even though the `ADM07` board's mock omits it — it's the real field gating
`applyEvidenceStatus` (`src/lib/actions/progress.ts`), not something to drop just because the board
simplified it.

**Design canvas kept in sync (both boards redrawn, same session):**
- `ADM07-CriteriaAuthoring.dc.html` — redrawn from a standalone page (own breadcrumb) to show the
  embedded rail panel instead, matching the real final shape above.
- `ADM06-CurriculumBuilder.dc.html` — also redrawn. Its *previous* version didn't match the real app
  at all: it showed every section's lessons flat-stacked on one page, with a per-section "quiz" row
  and an inline "Practical evidence" lesson row. Neither is real — `Lesson.type` is only
  video/text/image/resource (no quiz/evidence type), Knowledge Assessment is one course-level quiz
  (not per-section), and evidence criteria are the separate `ADM07` rail panel, not a lesson row.
  Redrawn to show the real left rail with one selected section's real lesson list on the right.
- Both published to the same canvas (`https://claude.ai/artifact/6othp9hKDpwXeLJsWtkt3Y`), same
  frame positions/sizes — no `canvas.json` index change needed. `docs/MOCKUP-INDEX.md`'s `ADM06`/
  `ADM07` rows updated to record the correction.

Verified: `npx tsc --noEmit` clean project-wide and `npx eslint` clean on every touched file, at each
step of this detour (initial retrofit, the standalone-route attempt, and the fold-back).

### Full-project build verification (2026-11-24, all of Batch A/B/C + ADM06/ADM07)

No dev server was running (`netstat` checked first, per this doc's process rules). Ran
`npm run build`: first attempt failed with `.next/dev/types/routes.d.ts` syntax errors — the known
stale-`.next`-from-a-prior-dev-session corruption documented in `CLAUDE.local.md` #2, not a real type
error. Fixed with `rm -rf .next` and rebuilt clean: **`npm run build` succeeded**, all routes
compiled including `/admin/courses/[courseId]`, `/admin/pathway`, `/admin/wioa/boards`,
`/admin/wioa/document-requirements`, `/admin/wioa/email-template` — and
`/admin/courses/[courseId]/criteria` correctly does **not** appear (confirms the deleted route is
really gone).

**Still outstanding for all of Batch A/B/C and ADM06/ADM07: the user's own visual/browser pass.**
None of this has been clicked through and confirmed against its boards yet.

### Sidebar structural retrofit (`AppSidebar.tsx`/`NavMain.tsx`/`src/lib/nav.ts`)

Added 2026-11-23, after the user compared the live Dashboard against `ADM02-Dashboard.dc.html`
and asked for the sidebar fixed to match `Sidebar.dc.html` directly — reopening the scope boundary
above. Real change: `NavItem`/`NavGroup` in `src/lib/nav.ts` gained an optional `section` field;
`adminNav` now carries the board's real section labels ("Dashboards", "Learning & curriculum",
"Review & cohorts", "Funding (WIOA)", "System") and matching item order/grouping, and `NavMain.tsx`
renders a `SidebarGroupLabel` (wrapped in a `SidebarMenuItem` so it stays valid `<li>` markup
inside the `<ul>`-based `SidebarMenu` — a bare `SidebarGroupLabel` div can't be a direct child of
a `<ul>`) whenever an entry's section differs from the previous one.

Deliberately did **not** add the board's Quiz Bank, Cohorts, Announcements, Data Import/Export nav
items, Inbox icon button, or the promotional banner card at the bottom of the expanded sidebar —
none of those have a real route/feature behind them yet (consistent with
`docs/MOCKUP-INDEX.md`'s routing-gaps list and this doc's own "don't fabricate" standard applied
to every other screen in this batch). Only real, already-existing routes were reordered/grouped.

Real bug found and fixed during this change: the first implementation mutated a `let lastSection`
variable inside the `items.map()` render callback to decide when to show each section label —
`eslint`'s `react-hooks/immutability` rule correctly flagged this as unsafe (reassigning state
during render can produce inconsistent results across renders). Fixed by precomputing a
`showSectionLabels: boolean[]` array in a plain `for` loop before the JSX `.map()`, not mutating
anything during render.

Verified: `npx tsc --noEmit` clean project-wide, `npx eslint` clean on `src/lib/nav.ts`,
`NavMain.tsx`, `AppSidebar.tsx`. Visual check deferred to the user, same as the rest of this batch.

### Border color + root `data-system` bugs found during user's visual pass (2026-11-23)

Three more real bugs found while the user compared the live app against the boards, same session:

1. **Curved/floating main-content card instead of a flat separated line.** `AppSidebar.tsx` had
   `<Sidebar variant="inset">`, shadcn's floating-card variant — it puts a margin + `rounded-xl` +
   `shadow-sm` around the main content (`SidebarInset`'s `peer-data-[variant=inset]` classes),
   producing a rounded floating panel instead of the board's single-outer-border, flat-internal-
   divider shell (`.wrap{border-radius:12px}` with plain `.sb{border-right}`/`.hdr{border-bottom}`
   dividers inside it). Changed to `variant="sidebar"` (the plain, non-floating variant).
2. **Sidebar/header divider lines rendered near-black instead of light gray.** `border-r`/`border-l`
   (`admin-ui/sidebar.tsx`) and `border-b` (`AdminHeader.tsx`) had no explicit border-color
   utility. Tailwind v4's default border color is `currentColor`, not a theme token, and this repo
   has no global `* { border-color: var(--border) }` reset — so these bare `border-*` utilities
   rendered as near-black (ink/text color) instead of the light `--sidebar-border`/`--border`
   tokens. Fixed by adding explicit `border-sidebar-border`/`border-border` classes.
3. **Root cause of the KPI card (and likely other) color mismatches: Admin's shell never set
   `data-system="staff"`.** `src/app/design-tokens.css`'s `[data-system='staff']` block is where
   `--accent`, `--surface`/`--surface-muted`, `--ink`/`--ink-muted`/`--ink-faint`, `--border`,
   every `--sidebar-*` token, and `--radius-xl` (among others) actually get their real values for
   the staff palette — `:root` alone doesn't define `--accent` or `--radius-xl` at all. Learner/
   Coordinator/Partner's shell (`AppShell.tsx`) sets `data-system="staff"`/`"learner"` on its root
   `.sshell` div (from Step 1.4 of the design-system migration); **Admin's shell never did**, on
   any route, the entire time this workstream has been retrofitting Admin screens onto classes
   (`.mcard`, `.panel`, `.pagehdr`, etc.) that read those tokens. Every retrofitted Admin screen
   this batch (Dashboard, Learners, Audit Log) has been rendering on incomplete `:root`-only
   fallback values, not the real staff palette, which is why the KPI cards (and potentially other
   elements) didn't visually match their boards even though the markup/classes were correct. Fixed
   by passing `data-system="staff"` to `<SidebarProvider>` in `src/app/admin/layout.tsx` (it
   forwards arbitrary props to its root wrapper div). **This is a broad-impact fix — every Admin
   screen's colors may visibly shift, not just the ones retrofitted so far** — worth a fresh look
   across all of Admin, not just Dashboard/Learners/Audit Log.
4. Also corrected `.mcard`'s own CSS rule in `design-system.css`, which had been independently
   rewritten rather than literally ported from `nfcap.css` — flat `var(--surface)` + `1px border`
   instead of the board's gradient background + box-shadow, `--radius-lg` instead of `--radius-xl`,
   and smaller/bolder number text (26px/600) instead of the board's 30px/500. Now matches
   `nfcap.css`'s `.mcard` rule exactly (gradient background, box-shadow, `--radius-xl`, 30px/500
   numerals).

Verified: `npx tsc --noEmit` clean project-wide after all four fixes. CSS/Tailwind changes aren't
covered by `eslint`/`tsc`; visual re-check still deferred to the user.
