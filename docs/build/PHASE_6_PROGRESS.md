# Phase 6 — Communication & Operations — execution status

Working log against `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`'s "Phase 6 —
Communication & Operations" (8 features, 184h). Mirrors `docs/build/PHASE_0_PROGRESS.md` through
`PHASE_5_PROGRESS.md`'s convention.

## Status as of 2026-11-27 (baseline)

**This phase was labeled "Not Started" and that was stale.** A code-level verification pass on
2026-11-25 (`docs/build/CODE_VERIFICATION_AUDIT_2026-11-25.md`) found substantial unlabeled work
already shipped: **2 of 8 features fully built**, 1 built on the admin side only, 4 with real
schema and backend work but no UI, and 1 with a wiring gap *plus* a live bug.

This file is the baseline created from that audit so the work is not re-discovered a third time.
No Phase 6 feature has been credited or formally verified yet — the states below are what the
code says, not approved deliverables.

Active plan for the first feature taken up (Notification Coverage Completion):
`docs/plans/notifications-and-upload-cap-kickoff.md`.

| # | Feature | Hrs | State |
| - | --- | ---: | --- |
| 1 | Trainee ↔ Staff Messaging | 36 | **Backend only.** Full schema + server actions (`startThread`, `sendMessage`, `markThreadRead`, RLS-scoped) in `src/lib/actions/messaging.ts`, whose own comment says "No UI wired to these yet." Zero UI in `src/app` or `src/components`. **No Admin-side messaging board exists at all** — `docs/MOCKUP-INDEX.md` names this as a real gap, not a judgment call; only `LRN14`/`LRN15` (trainee side) exist. An Admin inbox is drafted in `temp_ss/adm-inbox-wip.html` but not on the canvas. |
| 2 | Announcements | 14 | **Built & working.** Schema `prisma/schema.prisma:866-876`; admin authoring `src/app/admin/announcements/AnnouncementsView.tsx`; learner banner in `HomeView.tsx` (`markAnnouncementRead`). Full loop confirmed by the audit. Extended 2026-11-27 (`62bf37a`) to wire Coordinator/Partner. |
| 3 | Notification Coverage Completion | 18 | **In progress — schema + CRUD only, nothing wired.** `Notification` model and `NotificationType` enum exist; `createNotification`/`markNotificationRead` (`src/lib/actions/notifications.ts`) and `getNotificationsForUser`/`getUnreadNotificationCount` (`src/lib/data/notifications.ts`) exist with **zero callers and no panel UI**. Both shells already render a bell that opens nothing. **Not the same thing** as the 2026-11-26 "toast notification system" commit (`e82c331`) — that is `src/components/ui/Toaster.tsx`/`sonner`, ephemeral client-side toasts, unrelated to the persisted `Notification` model this feature covers. Plan: `docs/plans/notifications-and-upload-cap-kickoff.md` (`NOTIF-0`–`NOTIF-3`, plus `CAP-3`). **Estimate risk recorded there — two panels, four states each, three emitters and two trigger fixes plausibly exceed 18h.** |
| 4 | Bulk / CSV Enrollment | 18 | **Built & working, admin side.** `bulkEnrollLearners` (`src/lib/actions/data-io.ts:109-161`), batched, audit-logged, scoped to existing accounts + OPEN courses only. |
| 5 | Cohorts & Deadlines | 24 | **Partial.** `Cohort`/`CohortMembership` built with real admin UI (`src/app/admin/cohorts/CohortsView.tsx`); real cohort assignment added 2026-11-26 (`8f3f4db`). `CohortDeadline` model exists in schema with **no UI anywhere** — the "Deadlines" half of this feature is unbuilt. |
| 6 | Admin Reporting Depth | 28 | **Not built.** `src/app/admin/analytics/page.tsx` is a literal `AdminPlaceholderScreen`. `EnrollmentSnapshot` model exists in schema, unused by any reader or writer. |
| 7 | Data Export | 14 | **Built & working.** `exportLearnersCsv`/`exportEvidenceReviewHistoryCsv`/`exportWioaCasesCsv` (`src/lib/actions/data-io.ts:29-107`), audit-logged. CSV export also added to admin tables 2026-11-26 (`8f3f4db`). |
| 8 | Quiz Engine Depth | 32 | **Partial, with an active regression.** Question-bank draw, Fisher-Yates randomization and `maxAttempts` logic are real (`src/lib/data/quiz.ts:41-79`), but the live learner flow (`src/components/learner/QuizFlow.tsx`) bypasses it entirely: fixed question order, `maxAttempts` displayed but **not enforced**, and it **reveals the correct answer on every result screen** (`QuizFlow.tsx:342`) regardless of attempts remaining — the exact opposite of this feature's requirement. Tracked as a defect, not just unfinished work: `docs/build/DEFECTS_AND_HARDENING.md`. |

## Phase 6 "Done when" (from the client scope doc)

- [ ] A trainee can message staff from inside the system and get a reply
- [ ] Announcements reach trainees and key events reliably notify
- [ ] A cohort can be enrolled from a spreadsheet in one action
- [ ] Quiz retakes no longer reveal the answers, and reporting covers cohort trends

Note that criterion 2's second half — *"key events reliably notify"* — is what feature #3 buys,
and it is why `CAP-3` (notifying staff when a learner is stuck on a document) sits inside this
feature's 18h rather than being treated as new scope.

## What's being worked on now

`NOTIF-0`–`NOTIF-3` under feature #3, per
`docs/plans/notifications-and-upload-cap-kickoff.md`. Two decisions already closed there and not to
be reopened: **two notification panels** (learner shell and staff shell are genuinely different,
and `CLAUDE.local.md` #1 is the reason not to share one), and **in-app only, no email** until a
verified sending domain exists.

`NOTIF-1` is blocked on Step 0 — neither notification panel board is drawn. `ADM18-NotificationsPanel`
has a row in `docs/MOCKUP-INDEX.md` with status `new`, but that row exists to reconcile the index
with the live canvas; the board itself does not exist, and the index lists it under missing
interaction/state boards. The learner equivalent has no board id assigned yet.

## Known traps specific to this phase

- **Adding a `NotificationType` enum value is a schema change.** Per `CLAUDE.local.md` #8, generate
  *and apply* the migration before any code depends on it; per #3, restart the dev server after
  `prisma generate` or a stale in-memory client throws a phantom "Invalid value for argument".
- **`createNotification` is role-gated to `ADMIN`/`WIOA_COORDINATOR`.** Correct for a directly
  callable `'use server'` export, but it makes the function unusable for system-generated
  notifications where the acting user is a learner. `NOTIF-0` splits the emit path; everything else
  in feature #3 is blocked on it.
- **Three different things get called "notifications" in this repo** — ephemeral toasts
  (`Toaster.tsx`), broadcast announcements (feature #2), and per-recipient notifications
  (feature #3). Keep them apart when reading commits or writing progress rows.
