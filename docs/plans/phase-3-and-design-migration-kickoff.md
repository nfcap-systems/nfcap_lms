# Phase 3 + Design-System Migration — kickoff plan

Written 2026-11-22. Covers starting Phase 3 (Evidence & Competency, 12 features, 260h) and the
design-system migration it depends on, **without Plane connected** — Plane sync is deferred and
will be backfilled from this doc once it's connected (see Step 3). This file is the local source
of truth until then; it is not `tasks/TRACKER.md` and is never a substitute for it.

## Deviations from `docs/DEV-APPROACH.md` being consciously accepted

- Single session doing both lead and builder roles, instead of the two-session split.
- No Plane ticket exists yet for any of this work — backfilled later (Step 3).
- Building before the full NFCAP-6 gate (all mockups) is approved — only the boards Phase 3
  actually needs get approved now (Step 0), not the whole canvas.

Accepted because: solo developer on this project right now (no collision risk), and the relevant
boards/scope are otherwise settled.

- **Added 2026-11-22, after PR #9:** bundling Step 1's remaining sub-items (new shared patterns,
  then the Phase 0-2 retrofit) into fewer, larger PRs instead of one per sub-item — each CI run
  (lint, build, Vitest, Playwright against real Postgres) plus a blue/green `stage` deploy was
  costing 5-20 minutes per PR, too slow at this granularity. The progress-log table below still
  gets one row per sub-item regardless of how many land in one PR, so Step 3's Plane backfill
  stays exact; only the git/PR boundary got coarser, not the record of what happened.

## Step 0 — Approve the boards Phase 3 actually needs

Review and mark approved (canvas comment) before building against them:
`LRN06-EvidenceCriteria`, `LRN06b-EvidenceCapture`, `LRN06c-EvidenceCapturePhone`,
`LRN06d-EvidenceNotMet`, `LRN06e-EvidenceResubmit`, `LRN06f-AttemptHistory`,
`JRN09-AdminReview`, `ADM10-ReviewQueue`, `ADM11-PerCriterionReview`, `ADM12-PhotoAnnotation`.

Nothing else in the canvas needs to move for this to proceed (J13/J14 journeys, the broader
approval pass, and CRD/PTN/RPT/SET are not blockers for Phase 3).

**Status: approved verbally, in this session, 2026-11-22** — all ten boards above. Note: the
canvas's own comment system (`https://claude.ai/artifact/6othp9hKDpwXeLJsWtkt3Y`) is
`composer_only` — Claude can reply to a thread the user activates, but cannot originate a new
comment there. So this verbal approval, logged here, is the record of Step 0; if a canvas-side
comment is also wanted for the official trail, the user adds it by hand.

## Step 1 — Design-system migration (before Phase 3 UI work)

Why first: the live app's shared components (`src/components/ui/`: Button, Card, Badge, Dialog,
Drawer, Field, Input, ProgressBar, Spinner) have zero reference to `nfcap.css` or the new canvas
design direction (FND01–14) anywhere in `src/`. Building Phase 3 screens to match the new canvas
boards literally, on top of the old component library, would leave two visual systems live in the
same app. This migration is **not in the approved 65-feature build plan** — it's unbudgeted scope,
knowingly taken on.

1. Port `nfcap.css`'s tokens (color, type, spacing, the `--chart-*` tokens) into the codebase.
2. Rebuild `src/components/ui/`'s existing primitives to match `FND01`–`14`: `Button`, `Card`,
   `Badge`, `Dialog`, `Drawer`, `Field`, `Input`, `ProgressBar`, `Spinner`.
3. Add the new shared patterns the canvas has that code doesn't yet: the canonical data-table
   pattern (`.dtcard`), the tab-bar/completion-ring profile header (`.ptabs`/`.pring`), the
   segmented toggle (`.segrange`), the icon set (`FND11`), empty/error/loading states (`FND10`).
4. Retrofit Phase 0–2's already-built screens onto the rebuilt components; visual-compare against
   boards marked `exists`/`extend`, not just a glance — "close enough" doesn't count, per
   `docs/MOCKUP-INDEX.md`'s own "three mistakes" note.
5. One branch per component group (not one giant branch): `feature/design-system-migration-<step>`.
   PR title: `Design system: <step>`.

## Step 2 — Phase 3 build, in dependency order

Build against the now-updated component library, matching `LRN06`/`JRN09`/`ADM10`–`12` for real.

| # | Feature | Hrs | Notes |
| - | --- | ---: | --- |
| 1 | Real Evidence File Storage | 32 | Everything else depends on this. Follow `src/lib/supabase/wioa-storage.ts`'s private-bucket + signed-URL pattern, extended for video. |
| 2 | Image Downscaling & Storage Cost Control | 12 | Resize at upload time, not per-request (`docs/build/PERFORMANCE_PLAN.md` §5.2). |
| 3 | Per-Course Assessment Criteria | 18 | Blocked on NFCAP's trade experts for real content; can build/test against placeholder criteria. |
| 4 | Criteria Authoring Interface | 24 | Follow the course builder's existing content-block editing pattern. |
| 5 | Criteria Authoring Support (NFCAP) | 12 | Working sessions with trade experts, not pure engineering. |
| 6 | ★ Reviewer Queue | 24 | |
| 7 | ★ Per-Criterion Review & Gated Certification | 40 | Core value of the product — build as an isolated, fully tested rules layer. |
| 8 | Photo Annotation | 20 | |
| 9 | Guided Evidence Capture | 28 | Extends the existing course learning screen. |
| 10 | Per-Criterion Feedback & Targeted Resubmission | 24 | |
| 11 | Attempt History | 12 | Reuse the "latest attempt computed at query time" pattern already used by `QuizAttempt`/`EvidenceSubmission`. |
| 12 | Legacy Data & Regression Pass | 14 | Confirm certificates, portfolio, dashboards, search, and the WIOA module are unaffected. |

One branch per feature: `feature/phase3-<n>-<short-name>` → PR `Phase 3.<n>: <name>` → `stage`.
Each one gets the normal quality gates: `npm run lint`, `npm run build`, `npm test`
(`npm run test:e2e` where Docker is available), plus a real visual compare against its approved
board — logged here (branch, PR link/merge commit, state, date) as each one finishes, so Step 3
has exact data to backfill from instead of guessing which commits belong to which feature.

### Progress log (update as each item finishes)

**Accuracy rule — this table is the only thing Step 3's Plane backfill trusts, so it must be
right:** update it the moment a state actually changes (branch created, PR opened, PR merged),
never in a batch after the fact. Verify against real `git`/`gh` state before writing a row, never
from memory. Never write "merged"/"done" without checking the merge actually happened. If a
state is unverified, say so in the row (e.g., "merge status unverified") rather than guess.

| Item | Branch | PR / merge commit | State | Date |
| --- | --- | --- | --- | --- |
| Step 1.2 — rebuild `src/components/ui` primitives (Button, Badge, Card, Dialog, Drawer, Field, Input, ProgressBar, Spinner) | `feature/design-system-migration-primitives` | PR #9, merge commit `c5077af` | Merged to `stage` | 2026-11-22 |
| Step 1.3 — new shared patterns (StateCard/Skeleton, SegmentedToggle, DataTableCard family, ProfileHeader/CompletionRing/ProfileTabs) | `feature/design-system-migration-patterns` | PR #10, merged | Merged to `stage` | 2026-11-22 |
| Step 1.4 — retrofit Learner shell (`LearnerShell.tsx`, `LearnerHeader.tsx`) to FND13-Shells | `feature/design-system-migration-retrofit-learner` | not yet opened — user paused stage merges 2026-11-22, accumulating on this branch | Committed, pushed, **not merged** | 2026-11-22 |
| Step 1.4 — retrofit Staff shells (`AppShell`/`Sidebar`/`Header` for Coordinator/Partner) | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. Admin's `AppSidebar` (shadcn) needed no retrofit — already matches via globals.css's own sidebar/primary oklch theme block, the exact source the new tokens' staff oklch values were copied from. | 2026-11-22 |
| Step 1.4 — retrofit Learner Home screen (`HomeView.tsx`) to `LRN01-Home` | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. Visually verified via Playwright + the demo learner login (`priya.shah@demo.nfcap.test`) — real bug found and fixed (empty gray header bar from a stretched pill background). Mentor shown as a stub (no real data model); funding status now fetched on Home; "Upcoming task" only renders when real evidence-task data exists. | 2026-11-22 |
| **Out-of-scope fix, found during the above** — `WioaCase` RLS policies rejected every real case creation (42501), silently, since Phase 1's RLS migration — WIOA case creation had never worked through the app. | `feature/design-system-migration-retrofit-learner` (commit `412caf3`) | not yet opened — stage merges paused | Fixed and verified end-to-end (direct `withRlsContext` call + real learner Funding-page UI flow). Two migrations: `20261122165726_fix_wioa_case_insert_check`, `20261122170153_fix_wioa_case_select_self_reference`. Both applied live to the shared Supabase project via `prisma migrate deploy`. | 2026-11-22 |
| Step 1.4 — retrofit Coordinator/Partner case list (`WioaCaseListView.tsx`) to `CRD01-CaseList` | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. Full canonical `.dtcard` pattern (KPI tiles, filters, search, real CSV export, data-table with assignment/next-appointment/days-open). `getWioaCases` extended with real next-appointment data. Visually verified via Playwright against a real Coordinator login and real case data. | 2026-11-22 |
| Step 1.4 — retrofit case detail view (`WioaCaseDetailView.tsx`) to `CRD02-CaseDetail` | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. Breadcrumb + completion-ring profile header + 3-tab layout (Overview/Documents/Status history), replacing the old flat Card stack. All real functionality preserved unchanged (document review, status advance + appointment scheduling, assignment, funding form). Visually verified via Playwright across all 3 tabs. | 2026-11-22 |
| Step 1.4 — retrofit My Learning (`MyLearningView.tsx`) to `LRN02-Pathway` | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. 3-tab view (In Progress/Completed/Certificates) over the full pathway including locked courses, not just enrolled ones. `page.tsx` now fetches full pathway + unlock state + credentials. Checked Admin's `DashboardView.tsx` against `ADM02-Dashboard` first — already a real, well-built shadcn dashboard with open product questions on the board itself, not a clean retrofit target; skipped in favor of this screen. Visually verified via Playwright across all 3 tabs. | 2026-11-22 |
| Step 1.4 — retrofit Portfolio (`PortfolioView.tsx`) to `LRN07-Portfolio` | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. 4-stat KPI row, evidence grouped by course, sidebar (How review works, mentor stub). `page.tsx` now also fetches the full progress map so "Awaiting review" is real. Deliberately dropped the board's "Share your portfolio" panel — no such feature exists, out of scope for a UI retrofit. Visually verified via Playwright with real evidence data across 4 courses. | 2026-11-22 |
| Step 1.4 — retrofit Certificates (`CertificatesView.tsx`) to `LRN08-Certificates` | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. 3-stat KPI row, full-pathway credential grid (earned/in-progress/locked), sidebar with next-up course and mentor stub. Adjusted "How verification works" copy since the board's public verify link (`LRN09-PublicVerify`) has no real route yet. Also fixed a real bug found during verification: `CertificateDocument.tsx`'s preview drawer was still red (old theme), inconsistent with the rest of the retrofitted blue page. Visually verified via Playwright, including the drawer. | 2026-11-22 |
| Step 1.4 — retrofit Course Catalog (`ExploreView.tsx`) to `LRN13-OpenCourseEnrol` | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. Hero + 3-stat row + category filter chips + 2-col grid + sidebar. Rewrote the board's "self-pay checkout" framing to match the real flow (view course → added to My Learning, no payment step exists) — consistent with `MOCKUP-INDEX.md`'s already-flagged "Open question 1" on this board. Dropped the board's fake Beginner/Intermediate level chips (no difficulty field exists); used real category/lesson/hour fields instead. Real bug found and fixed: category filter showed "Trade Skills" and "trade skills" as separate chips (inconsistent seed casing) — now case-insensitive. Visually verified via Playwright. | 2026-11-22 |
| Step 1.4 — retrofit course player's old-theme color utilities (`CourseLearningView`, `LessonSidebar`, `LessonContent`, `QuizView`, `EvidenceView`) | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. No matching board exists for this screen's real combined layout (LRN03 has no route per `MOCKUP-INDEX.md`; LRN04/05 explore player/quiz separately) — component tree already used the retrofitted primitives, so this was a ~90-usage sweep of leftover old-theme Tailwind utilities to arbitrary-value tokens, no structural change. Visually verified via Playwright: lesson content, passed quiz, verified evidence. | 2026-11-22 |
| Step 1.4 — retrofit Funding screen's old-theme color utilities (`FundingView`, `WioaCaseFeed`) | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. `LRN10-FundingStatus`'s board uses a different step-timeline structure than the real implementation (which has more functional states the board doesn't show: address capture, no-office-matched, outreach/requirements dialogs) — same sweep approach as the course player, no structural change. Visually verified via Playwright against the demo WIOA learner, including the outreach email dialog. | 2026-11-22 |
| Step 1.4 — sweep remaining old-theme utilities app-wide (Profile, Account Settings ×3 roles, Coordinator/Partner Reports, error page, `PlaceholderScreen`, `GlobalSearch`/`NotificationsMenu`, leftover sub-functions in already-touched files) | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. Also closed the long-standing `GlobalSearch`/`NotificationsMenu` gap flagged during the Learner shell retrofit (deferred then because it touched Staff-shell territory, which is now also retrofitted). Visually verified via Playwright: Profile, Account Settings. | 2026-11-22 |
| Step 1.4 — retrofit pre-auth screens (`AuthShell`, Login, Signup, Forgot/Reset Password, Privacy, Terms) | `feature/design-system-migration-retrofit-learner` | not yet opened — stage merges paused | Committed, pushed, **not merged**. No `[data-system]` existed pre-login anywhere — set `data-system="learner"` on `AuthShell`'s root and on privacy/terms' own roots (no board distinguishes a staff auth experience), then the same sweep. **This closes Step 1.4's old-`@theme`-palette removal across the entire non-Admin app** — confirmed via a repo-wide grep for the old utility classes returning nothing outside `src/components/admin-ui`/`admin-shell`, which intentionally use shadcn's own tokens and were never in scope. Visually verified via Playwright: `/login`, `/signup`. | 2026-11-22 |

**Step 1.4 status: substantially complete.** Every screen in the non-Admin app now renders on the
new design-system tokens with zero old-`@theme`-palette leftovers (verified by repo-wide grep).
Full literal board-matching (not just a token sweep) was done for the highest-traffic/most central
screens: both shells, Learner Home, My Learning, Portfolio, Certificates, Course Catalog,
Coordinator/Partner case list, and case detail. A few screens (course player, Funding, Reports)
got the token sweep only, not a full visual rebuild, because either no matching board exists for
their real combined structure (course player — `LRN03` has no route) or the board's structure
diverges meaningfully from functional states the real screen has that the board doesn't show
(Funding, Reports) — both logged above with the specific reasoning per screen. Admin needed no
retrofit at all (already matches natively via shadcn). Remaining optional work, if wanted: a
literal pixel-match pass on Reports (`RPT01`/`RPT02`) and the course player — lower priority since
both are already visually consistent, just not pixel-identical to their boards.

## Step 3 — Backfill into Plane, once connected

1. Create tickets for the design-system migration steps and all 12 Phase 3 features, from this
   doc — not guessed from commit history.
2. Set each ticket to its **true current state** (In Progress / On Stage / Done) — never Done
   without proof it's live in production.
3. Rename any still-unmerged branch to the real `NFCAP-n`; retitle any open PR to
   `NFCAP-n: …`.
4. For anything already merged, add a ticket comment linking the PR/merge commit instead of
   retitling it.
5. Run `/project-pm sync` to regenerate `tasks/TRACKER.md` from the now-real Plane state.
