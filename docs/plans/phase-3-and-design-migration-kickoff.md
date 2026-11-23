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

**Board → feature mapping — added 2026-11-23, after PR #13.** Each of Step 0's 10 approved boards
belongs to exactly one feature below; when that feature is built, the board is the literal spec
(visual-compare verified, same standard as Step 1.4's retrofit — "close enough" doesn't count).
Features #1 and #2 have **no board** — they're storage/cost plumbing underneath the existing
(pre-redesign) evidence UI, not a visual change. The per-criterion model (`LRN06-EvidenceCriteria`
itself) can't be built before #3's criteria tree exists, which is why the real visual rebuild of
the evidence screen doesn't start until #7/#9, not #1.

| Board | Delivered by |
| --- | --- |
| `LRN06-EvidenceCriteria` | #7 Per-Criterion Review & Gated Certification |
| `LRN06b-EvidenceCapture`, `LRN06c-EvidenceCapturePhone` | #9 Guided Evidence Capture |
| `LRN06d-EvidenceNotMet`, `LRN06e-EvidenceResubmit` | #10 Per-Criterion Feedback & Targeted Resubmission |
| `LRN06f-AttemptHistory` | #11 Attempt History |
| `JRN09-AdminReview`, `ADM10-ReviewQueue`, `ADM11-PerCriterionReview` | #6 Reviewer Queue + #7 |
| `ADM12-PhotoAnnotation` | #8 Photo Annotation |

**Decision 2026-11-23 (re: PR #13 UI question):** explicitly keeping the planned order — PR #13
(Feature #1) stays storage-only, no `LRN06b/c` visual pull-forward. The real visual rework happens
later alongside the per-criterion model in #7/#9, not decoupled into an earlier pass.

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
| Step 1.4 — retrofit Learner shell (`LearnerShell.tsx`, `LearnerHeader.tsx`) to FND13-Shells | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage` | 2026-11-22 |
| Step 1.4 — retrofit Staff shells (`AppShell`/`Sidebar`/`Header` for Coordinator/Partner) | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. Admin's `AppSidebar` (shadcn) needed no retrofit — already matches via globals.css's own sidebar/primary oklch theme block, the exact source the new tokens' staff oklch values were copied from. | 2026-11-22 |
| Step 1.4 — retrofit Learner Home screen (`HomeView.tsx`) to `LRN01-Home` | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. Visually verified via Playwright + the demo learner login (`priya.shah@demo.nfcap.test`) — real bug found and fixed (empty gray header bar from a stretched pill background). Mentor shown as a stub (no real data model); funding status now fetched on Home; "Upcoming task" only renders when real evidence-task data exists. | 2026-11-22 |
| **Out-of-scope fix, found during the above** — `WioaCase` RLS policies rejected every real case creation (42501), silently, since Phase 1's RLS migration — WIOA case creation had never worked through the app. | `feature/design-system-migration-retrofit-learner` (commit `412caf3`) | PR #11, merge commit `c8075e0` | Merged to `stage`. Fixed and verified end-to-end (direct `withRlsContext` call + real learner Funding-page UI flow). Two migrations: `20261122165726_fix_wioa_case_insert_check`, `20261122170153_fix_wioa_case_select_self_reference`. Both applied live to the shared Supabase project via `prisma migrate deploy`. | 2026-11-22 |
| Step 1.4 — retrofit Coordinator/Partner case list (`WioaCaseListView.tsx`) to `CRD01-CaseList` | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. Full canonical `.dtcard` pattern (KPI tiles, filters, search, real CSV export, data-table with assignment/next-appointment/days-open). `getWioaCases` extended with real next-appointment data. Visually verified via Playwright against a real Coordinator login and real case data. | 2026-11-22 |
| Step 1.4 — retrofit case detail view (`WioaCaseDetailView.tsx`) to `CRD02-CaseDetail` | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. Breadcrumb + completion-ring profile header + 3-tab layout (Overview/Documents/Status history), replacing the old flat Card stack. All real functionality preserved unchanged (document review, status advance + appointment scheduling, assignment, funding form). Visually verified via Playwright across all 3 tabs. | 2026-11-22 |
| Step 1.4 — retrofit My Learning (`MyLearningView.tsx`) to `LRN02-Pathway` | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. 3-tab view (In Progress/Completed/Certificates) over the full pathway including locked courses, not just enrolled ones. `page.tsx` now fetches full pathway + unlock state + credentials. Checked Admin's `DashboardView.tsx` against `ADM02-Dashboard` first — already a real, well-built shadcn dashboard with open product questions on the board itself, not a clean retrofit target; skipped in favor of this screen. Visually verified via Playwright across all 3 tabs. | 2026-11-22 |
| Step 1.4 — retrofit Portfolio (`PortfolioView.tsx`) to `LRN07-Portfolio` | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. 4-stat KPI row, evidence grouped by course, sidebar (How review works, mentor stub). `page.tsx` now also fetches the full progress map so "Awaiting review" is real. Deliberately dropped the board's "Share your portfolio" panel — no such feature exists, out of scope for a UI retrofit. Visually verified via Playwright with real evidence data across 4 courses. | 2026-11-22 |
| Step 1.4 — retrofit Certificates (`CertificatesView.tsx`) to `LRN08-Certificates` | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. 3-stat KPI row, full-pathway credential grid (earned/in-progress/locked), sidebar with next-up course and mentor stub. Adjusted "How verification works" copy since the board's public verify link (`LRN09-PublicVerify`) has no real route yet. Also fixed a real bug found during verification: `CertificateDocument.tsx`'s preview drawer was still red (old theme), inconsistent with the rest of the retrofitted blue page. Visually verified via Playwright, including the drawer. | 2026-11-22 |
| Step 1.4 — retrofit Course Catalog (`ExploreView.tsx`) to `LRN13-OpenCourseEnrol` | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. Hero + 3-stat row + category filter chips + 2-col grid + sidebar. Rewrote the board's "self-pay checkout" framing to match the real flow (view course → added to My Learning, no payment step exists) — consistent with `MOCKUP-INDEX.md`'s already-flagged "Open question 1" on this board. Dropped the board's fake Beginner/Intermediate level chips (no difficulty field exists); used real category/lesson/hour fields instead. Real bug found and fixed: category filter showed "Trade Skills" and "trade skills" as separate chips (inconsistent seed casing) — now case-insensitive. Visually verified via Playwright. | 2026-11-22 |
| Step 1.4 — retrofit course player's old-theme color utilities (`CourseLearningView`, `LessonSidebar`, `LessonContent`, `QuizView`, `EvidenceView`) | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. No matching board exists for this screen's real combined layout (LRN03 has no route per `MOCKUP-INDEX.md`; LRN04/05 explore player/quiz separately) — component tree already used the retrofitted primitives, so this was a ~90-usage sweep of leftover old-theme Tailwind utilities to arbitrary-value tokens, no structural change. Visually verified via Playwright: lesson content, passed quiz, verified evidence. | 2026-11-22 |
| Step 1.4 — retrofit Funding screen's old-theme color utilities (`FundingView`, `WioaCaseFeed`) | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. `LRN10-FundingStatus`'s board uses a different step-timeline structure than the real implementation (which has more functional states the board doesn't show: address capture, no-office-matched, outreach/requirements dialogs) — same sweep approach as the course player, no structural change. Visually verified via Playwright against the demo WIOA learner, including the outreach email dialog. | 2026-11-22 |
| Step 1.4 — sweep remaining old-theme utilities app-wide (Profile, Account Settings ×3 roles, Coordinator/Partner Reports, error page, `PlaceholderScreen`, `GlobalSearch`/`NotificationsMenu`, leftover sub-functions in already-touched files) | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. Also closed the long-standing `GlobalSearch`/`NotificationsMenu` gap flagged during the Learner shell retrofit (deferred then because it touched Staff-shell territory, which is now also retrofitted). Visually verified via Playwright: Profile, Account Settings. | 2026-11-22 |
| Step 1.4 — retrofit pre-auth screens (`AuthShell`, Login, Signup, Forgot/Reset Password, Privacy, Terms) | `feature/design-system-migration-retrofit-learner` | PR #11, merge commit `c8075e0` | Merged to `stage`. No `[data-system]` existed pre-login anywhere — set `data-system="learner"` on `AuthShell`'s root and on privacy/terms' own roots (no board distinguishes a staff auth experience), then the same sweep. **This closes Step 1.4's old-`@theme`-palette removal across the entire non-Admin app** — confirmed via a repo-wide grep for the old utility classes returning nothing outside `src/components/admin-ui`/`admin-shell`, which intentionally use shadcn's own tokens and were never in scope. Visually verified via Playwright: `/login`, `/signup`. | 2026-11-22 |
| Step 1.4 — retrofit Reports (`WioaReportsView.tsx`, shared by `/coordinator/reports`, `/partner/reports`, `/admin/wioa/reports`) to `RPT02-FundingImpact` | `feature/design-system-migration-retrofit-learner` (commit `6aeed80`) | PR #11, merge commit `c8075e0` | Merged to `stage`. Added a real Funding Impact section — `getWioaReportingSummary` extended with total approved funding, approval rate, avg days to approval, and cases-funded-by-workforce-board, all from real `FundingAuthorization.approvedAmount`/`approvalDate` fields. Deliberately dropped the board's requested-vs-approved chart (no "requested amount" field exists in the schema — would be fabricated) and its Coordinator/Admin/Partner segmented-tab toggle (visibility is already correctly enforced server-side via `includeFunding`; a client-side tab a viewer could click into a role they don't have would be worse than no tab). Also fixed a real lint error found on this branch: `AppShell.tsx` called `setState` synchronously inside an effect to read `sidebarCollapsed` from `localStorage`, tripping React's `set-state-in-effect` rule — switched to a lazy `useState` initializer. Lint and build both clean. Visually verified via Playwright: `/coordinator/reports` (real pipeline/document/funding data) and `/partner/reports` (correct empty state), zero console/page errors on either. | 2026-11-23 |
| Step 1.4 — Partner Staff real roster/detail views (`PartnerRosterView.tsx`, `PartnerTraineeDetailView.tsx`) matching `PTN01-Roster`/`PTN02-LearnerDetail` — closes the gap flagged above | `feature/design-system-migration-retrofit-learner` | PR #12, merge commit `0cd1c8a` | Merged to `stage`. Jargon-free trainee roster, no funding amounts, single-page detail — replaces Coordinator's reused `WioaCaseListView`/`WioaCaseDetailView`. Added `NOTE` channel to `CommunicationChannel` for staff notes, verified no leak into the learner's own Funding-page outreach log. Real bug found and fixed: `src/lib/email.ts` constructed its Resend client eagerly at module scope, crashing any import chain lacking `RESEND_API_KEY` (including an unrelated unit test). | 2026-11-23 |
| Phase 3, Feature #1 — Real Evidence File Storage (32h) | `feature/phase3-1-evidence-storage` | PR #13, merge commit `af75626` | Merged to `stage`. Private-bucket storage module (`src/lib/supabase/evidence-storage.ts`, magic-byte validated PDF/JPG/PNG/MP4/MOV, signed URLs), new `EvidenceSubmission.filePath` column (migration `20261123060000_add_evidence_file_path`), new `getEvidenceFileUrl` action gated to the submitting learner or any Admin. Storage-only — no board, no UI rebuild (see board → feature mapping above). Visually verified via Playwright against the real dev DB (real JPEG upload → genuine Supabase signed URL) plus the user's own manual UI pass before merge. Gap: Admin's attachment-link click-through wasn't independently browser-verified — `admin@demo.nfcap.test` currently fails login in this environment, unrelated to this change. |
| Phase 3, Feature #2 — Image Downscaling & Storage Cost Control (12h) | `feature/phase3-2-image-downscaling` | PR #14, merge commit `6c710b4` | Merged to `stage` (state corrected 2026-11-23 during feature #12, verified against `gh pr view 14` and `git log origin/stage`; the row was written while the PR was still open and never updated after it merged). Extended `uploadEvidenceFile` (`src/lib/supabase/evidence-storage.ts`) with `downscaleImageIfNeeded`: JPEG/PNG evidence uploads are resized to a 2000px long-edge cap (`fit: inside`, no upscaling) and recompressed (JPEG q82, PNG level 9) at upload time, not per-request, per `docs/build/PERFORMANCE_PLAN.md` §5.2 — `sharp` was already a dependency. `.rotate()` applies EXIF orientation before re-encoding strips it. Video/PDF pass through unchanged (video delivery provider is a separate open decision, §5.2). Storage-only, no board (same as #1). Unit-tested directly (`tests/unit/evidence-image-downscale.test.ts`, pure function, no DB) — confirmed a 3000×2000 JPEG resizes to 2000×1333 and shrinks, a 400×300 JPEG is untouched, non-image types pass through unchanged. `npm run lint`/`npm run build`/`npm run format:check` clean; `npm test` not run this session — no local Docker Postgres available (per `CLAUDE.md`'s known environment limitation), left to CI. No visual change, so no Playwright pass expected beyond CI's existing evidence-upload E2E coverage. | 2026-11-23 |
| Phase 3, Feature #3 — Per-Course Assessment Criteria (18h) | `feature/phase3-3-assessment-criteria` | PR #15, merge commit `29c2f20` | Merged to `stage`. **Row added 2026-11-23 during feature #12** — this feature shipped without a progress-log row; reconstructed from `gh pr view 15` and `git log`, not from memory. New `AssessmentCriterion` model (title, guidance, `photoRequired`, `mandatoryForCertification`, order) scoped to `Course`, migration `20261123070000_add_assessment_criteria` applied to the dev DB; `getAssessmentCriteria` added to `src/lib/data/courses.ts` as a narrow standalone read, deliberately not folded into `courseInclude` (CLAUDE.md performance conventions). Backend/data-model only, no UI. Real criteria content stays blocked on NFCAP's trade experts (feature #5), so `prisma/seed.ts` seeds 2 clearly-labelled `[PLACEHOLDER]` criteria per course for #4/#6/#7 to build against. Unit tests in `tests/unit/assessment-criteria.test.ts`, left to CI (no local Docker Postgres). | 2026-11-23 |
| Phase 3, Feature #4 — Criteria Authoring Interface (24h) | `feature/phase3-4-criteria-authoring-interface` | PR #16, merge commit `7d68319` | Merged to `stage`. **Row added 2026-11-23 during feature #12**, same reconstruction as #3. Admin can create/edit/reorder/remove a course's assessment criteria from the course builder: new `addCriterion`/`updateCriterion`/`deleteCriterion`/`moveCriterion` actions in `src/lib/actions/curriculum.ts` mirroring the existing `addQuestion`/`moveContentBlock` pattern, plus an "Assessment Criteria" rail item and add/edit dialog in `CurriculumBuilderView`. Criteria reach `src/app/admin/courses/[courseId]/page.tsx` as a separate prop, still not via `courseInclude`. Unit tests in `tests/unit/assessment-criteria-actions.test.ts`, left to CI. Visually verified via Playwright against the real dev DB (add → edit → reorder → delete round-trip). | 2026-11-23 |
| Phase 3, Feature #6 — ★ Reviewer Queue (24h) | `feature/phase3-6-reviewer-queue` | PR #18, merge commit `3e4c5a8` | Merged to `stage`. **Row added 2026-11-23 during feature #12**, same reconstruction as #3. New `/admin/reviews` built against `ADM10-ReviewQueue` / `ADM25-ReviewQueueEmpty`: KPI tiles, course filter + sort chips, oldest-first table, row checkboxes + bulk approve, empty state; `bulkApproveEvidence` added to `src/lib/actions/progress.ts`; Dashboard's "Needs Review" `View all →` link repointed here from its `/admin/learners` workaround. Deliberate deviations from the board, both logged in the PR: dropped its fabricated "· Section" and "N photos" (an `EvidenceSubmission` was one course-level row with at most one file at the time — multi-photo arrived with #9), and "Review →" pointed at the existing approve/reject UI until #7 built the per-criterion screen. Note: this PR's bulk approve predates #7's gating and had no error handling for a refused row — the regression feature #12 found and fixed. (Related: PR #17, `fix: write APP_RUNTIME_DATABASE_URL into staging .env`, merge commit `23c3148` — a CI/deploy fix, not a scoped feature.) | 2026-11-23 |
| Phase 3, Feature #7 — ★ Per-Criterion Review & Gated Certification (40h) | `feature/phase3-7-per-criterion-review` | PR #19, merge commit `0861664` | Merged to `stage`. **Row added 2026-11-23 during feature #12**, same reconstruction as #3. `CriterionAssessment` per-criterion verdict layer on top of the whole-submission `EvidenceSubmission` review (migration `20261123080000_add_criterion_assessment`, applied live); new Admin screen `/admin/learners/[learnerId]/review/[courseId]` (ADM11) with Met/Not met + per-criterion note, overall note, Mark complete / Request resubmission; gated certification enforced centrally in `applyEvidenceStatus` so every caller goes through one check, with a course that has no criteria behaving exactly as before; learner-facing criteria checklist (LRN06) in `EvidenceView`. Flagged gap at the time: the manual UI pass (admin toggle, gate error, resubmission round-trip) wasn't completed in that session — **since closed by feature #12**, which drove the refusal case and the Met → Mark complete → certificate path end-to-end in the browser. | 2026-11-23 |
| Phase 3, Features #8 + #9 — Photo Annotation (20h) + Guided Evidence Capture (28h), bundled | `feature/phase3-8-9-photo-annotation-guided-capture` | PR #20, merge commit `9481620` | Merged to `stage` (state corrected 2026-11-23 during feature #12, verified against `gh pr view 20` and `git log origin/stage`). Schema: extended `CriterionAssessment` rather than adding a new model (already unique on `[evidenceSubmissionId, criterionId]`, the right granularity) — added `learnerFilePath`/`learnerFileName`/`learnerDescription`/`submittedAt` for the learner's per-criterion capture and `annotationData Json?` for the reviewer's annotation overlay; migration `20261123120000_add_criterion_capture_and_annotation`, applied to the shared dev DB. **#9**: `GuidedEvidenceCapture.tsx` replaces the single free-text+file form with a per-criterion walkthrough (step chips, "what to show", dropzone, optional notes) for any course with assessment criteria — matches `LRN06b-EvidenceCapture`; courses with zero criteria keep the legacy `EvidenceView` form unchanged. New `submitGuidedEvidence` action uploads all files before the transaction, then creates the `EvidenceSubmission` + all `CriterionAssessment` rows together (so nothing partial reaches the reviewer queue). `GuidedEvidenceCapture` not yet visually compared against `LRN06c-EvidenceCapturePhone` (desktop only this session). **#8**: `PhotoAnnotationDialog.tsx` — arrow/circle/freehand/pin tools on the learner's submitted photo, opened from `CriterionReviewView` (ADM11), matching `ADM12-PhotoAnnotation`'s toolbar/canvas/annotations-list layout; adapted as a wide dialog on the existing per-criterion review screen rather than a second route (documented in the component). New `saveCriterionAnnotation` action, admin-only. Real bugs found and fixed during Playwright verification against the real dev DB: a duplicate "Practical Evidence" badge; `Dialog.tsx`'s `max-w-5xl` override losing to its hardcoded `max-w-md` default because this project's `cn()` has no tailwind-merge dedup (fixed by only applying the default when no `className` is passed — no existing caller relied on the old behavior); Review Queue always showing "No attachment" for guided submissions because `hasFile` only checked the legacy `EvidenceSubmission.filePath` (fixed in `getProgressByLearner`); `scripts/seed-admin.ts` re-roling an existing account without resetting its password, the actual root cause of the `admin@demo.nfcap.test` login failures flagged by the two prior sessions on Features #1/#2 (fixed, plus the password was reset live). **Also found and fixed, pre-existing Feature #7 bug, out of scope but bundled at the user's explicit request**: `buildCertificateCode()` built the certificate code from the course slug alone, so the *second* learner ever certified for any course collided with the first on `Certificate.certificateCode`'s unique constraint and 500'd, leaving `EvidenceSubmission` stuck `approved` with no certificate (the two writes weren't transactional). Fixed by keying the code off `enrollmentId` too and wrapping both writes in one `$transaction`; reproduced live (Marcus Webb colliding with the seeded Priya Shah certificate on Flooring Fundamentals) and confirmed fixed the same way. `npm run lint`/`npm run build`/`npm run format:check` all clean. `npm test`/`npm run test:e2e` not run locally — no Docker Postgres in this environment, left to CI. Visually verified via Playwright against the real dev DB and Supabase storage: learner guided capture (upload, notes, multi-criterion step nav, submit), reviewer per-criterion view + annotate (draw, save, reload-confirmed persistence), and the full Met/Met → Mark complete → certificate-issued path end-to-end after the certificate fix. | 2026-11-23 |
| Phase 3, Features #10 + #11 — Per-Criterion Feedback & Targeted Resubmission (24h) + Attempt History (12h), bundled | `feature/phase3-10-11-feedback-resubmission-attempt-history` | PR #21, merge commit `091f786` | Merged to `stage` (state corrected 2026-11-23 during feature #12, verified against `gh pr view 21` and `git log origin/stage`). Built on #7 and #8+#9 (PR #20, `9481620`). `submitGuidedEvidence` now carries already-Met criteria forward into a new `EvidenceSubmission` (`CriterionAssessment.carriedForward`, migration `20261123150000_add_criterion_carried_forward`, applied to the shared Supabase project) and requires evidence only for the rest — decided server-side. New `EvidenceNotMet` (LRN06d), targeted resubmit in `GuidedEvidenceCapture` (LRN06e), and `/learner/courses/[courseId]/attempts/[criterionId]` (LRN06f); history is a query over each criterion's own `CriterionAssessment` rows, no history table, carried-forward copies excluded. `tsc`/ESLint/Prettier clean on touched files; unit tests in `tests/unit/criterion-resubmission.test.ts` not run locally (no Docker) — left to CI. **Not verified: no Playwright/visual compare against LRN06d/e/f was done; the user is doing the UI pass after merge.** | 2026-11-23 |
| Phase 3, Feature #12 — Legacy Data & Regression Pass (14h) | `feature/phase3-12-legacy-regression` | PR TBD (branch committed, PR not yet opened) | In Review. QA pass over certificates, portfolio, dashboards, search and the WIOA module after #7–#11 reshaped evidence review — not new functionality. **Four real regressions found, each reproduced in the browser against the real dev DB before being fixed and re-verified after:** (1) **legacy evidence invisible to the learner** — `EvidenceView` decided "guided" from the *course* having criteria rather than the *submission* having `CriterionAssessment` rows, so every pre-#9 submission on a course that has criteria now (i.e. all four seeded courses) rendered as an empty criteria checklist with the learner's own description and attachment hidden; split into `guided` (course shape, decides the form a new submission gets) vs. `submissionIsGuided`, backed by a new `EvidenceSubmission.isPerCriterion`. (2) **Portfolio blank cards** — `src/lib/data/credentials.ts` was never updated for guided submissions, whose `description` is empty by design, so a certified guided submission rendered as a card with nothing in it; it now carries each criterion's title/note/attachment (`Credential.criteria`), with legacy submissions rendering exactly as before. (3) **Admin learner-detail 500** — #8/#9 widened `hasFile` to include per-criterion captures, but `LearnerProfileView`'s "View attachment" calls `getEvidenceFileUrl`, which can only serve the course-level file; confirmed live as a 500 ("No file attached to this submission.") and fixed with a separate `hasSubmissionFile` — the same distinction the Review Queue's attachment badge already needed. (4) **Reviewer Queue bulk approve exploded** — #7's gating throws and #6's bulk approve had no error handling, so one gated row in a selection threw the whole page into the global error boundary *after* committing the rows before it; `bulkApproveEvidence` now returns `{ approved, skipped[] }` and the queue reports which rows need per-criterion review. Plus one cosmetic fix (a bare “” on the per-criterion review screen for guided submissions). **Verified unaffected:** already-issued legacy certificates display and verify; a course with no assessment criteria still approves and certifies exactly as before (tested end-to-end with a temporary course, since all four seeded courses have criteria — temp data removed afterwards); the gated path refuses, then certifies once every mandatory criterion is Met (certificate issued with #8/#9's unique-suffix code, coexisting with an older colliding-style code for the same course); Admin dashboard KPIs and the Review Queue's pending/approved/rejected counts, which key off `EvidenceSubmission.status` and are written identically by both paths; learner/course/certificate/portfolio search (`src/lib/data/search.ts`, `GlobalSearch`), which reads courses and certificates only and is untouched; and the WIOA module — `git diff 3e4c5a8..origin/stage` touches no WIOA file, and the Coordinator case list, Reports and the learner Funding page were smoke-checked with zero console errors. New DB-backed regression tests in `tests/unit/legacy-evidence-regression.test.ts` cover both submission shapes, the Portfolio mapping and bulk approve's partial-failure behaviour. `npx tsc --noEmit`, `npm run lint` and `npm run build` clean; `npm test`/`npm run test:e2e` not run locally (no Docker Postgres in this worktree, per CLAUDE.md) — left to CI. Note: `npm run format:check` fails repo-wide in this worktree (324 files, including files this branch never touched) because `core.autocrlf=true` checks everything out with CRLF — a pre-existing environment artifact, not this branch. | 2026-11-23 |

**Step 1.4 status: complete, merged to `stage`.** PR #11 (`feature/design-system-migration-retrofit-learner`
→ `stage`), CI green, merged 2026-11-22 as merge commit `c8075e0`, deployed. Every screen in the
non-Admin app now renders on the new design-system tokens with zero old-`@theme`-palette leftovers
(verified by repo-wide grep). Full literal board-matching (not just a token sweep) was done for
the highest-traffic/most central screens: both shells, Learner Home, My Learning, Portfolio,
Certificates, Course Catalog, Coordinator/Partner case list, case detail, and Reports. A few
screens (course player, Funding) got the token sweep only, not a full visual rebuild, because no
matching board exists for their real combined structure (course player — `LRN03` has no route) or
the board's structure diverges meaningfully from functional states the real screen has that the
board doesn't show (Funding) — both logged above with the specific reasoning per screen. Admin
needed no retrofit at all (already matches natively via shadcn). Remaining optional work, if
wanted: a literal pixel-match pass on the course player — lower priority since it's already
visually consistent, just not pixel-identical to its boards.

**This closed Step 1 of the design-system migration.** The one known gap flagged alongside it —
Partner Staff's case list/detail (`/partner`, `/partner/[caseId]`) rendering Coordinator's shared
`WioaCaseListView.tsx`/`WioaCaseDetailView.tsx` instead of its own `PTN01-Roster`/`PTN02-LearnerDetail`
boards — was **resolved the same session**, not left open: PR #12 (`Partner Staff: real
roster/detail views (PTN01/PTN02)`, merged 2026-11-23, merge commit `0cd1c8a`) built real
`PartnerRosterView`/`PartnerTraineeDetailView` components matching those boards (jargon-free
trainee roster, no funding amounts, single-page detail), replacing the reused Coordinator
components. Along the way it added a `NOTE` channel to `CommunicationChannel` for Partner Staff's
"Add a note" (verified it does not leak into the learner's own Funding-page outreach log) and
fixed a real bug: `src/lib/email.ts` constructed its Resend client eagerly at module scope, which
crashed any import chain (including an unrelated unit test file) whenever `RESEND_API_KEY` was
unset — fixed to construct lazily inside `sendEmail()`.

**Phase 3 Feature #1 — Real Evidence File Storage (32h) — complete, merged to `stage`.** PR #13
(`feature/phase3-1-evidence-storage` → `stage`), CI green, merged 2026-11-23 as merge commit
`af75626`. Evidence attachments are now real stored files (private bucket, magic-byte validated,
signed URLs), not just a display-only filename string — see `src/lib/supabase/evidence-storage.ts`
and the new `getEvidenceFileUrl` action in `src/lib/actions/progress.ts`. Deliberately storage-only,
no UI rebuild: it sits under the existing (pre-redesign) evidence form, not `LRN06b/c`'s capture
flow — see the board → feature mapping above for why. Visually verified via Playwright against the
real dev DB (a learner's real JPEG upload produces a genuine Supabase signed URL) and confirmed by
the user's own manual UI pass before merge. One flagged gap: Admin's review-screen attachment link
uses the identical action/UI pattern but wasn't independently browser-verified this session —
`admin@demo.nfcap.test` currently fails login ("Invalid login credentials") in this environment,
unrelated to this change; needs a password reset next session.

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
