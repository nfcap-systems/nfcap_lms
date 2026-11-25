# Phase 5 — Funding Module Productisation — execution status

Working log against `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`'s "Phase 5 —
Funding Module Productisation" (★ starred, 7 features, 130h). Mirrors `docs/build/PHASE_0_PROGRESS.md`
through `PHASE_4_PROGRESS.md`'s convention. Built on branch `feature/phase5-funding-productisation`
(off `stage`), per `docs/plans/phase-5-funding-productisation-kickoff.md`.

## Status as of 2026-11-25 (updated, same-day follow-up session)

**Nothing in this phase is committed or pushed yet, but it is now ready to be** — the
architecture question that blocked committing is resolved. `docs/plans/wioa-spec-alignment-
kickoff.md`'s #1 (case structure) has been fully built: the case/course split, migrations applied
to staging and verified against live data, every consumer in this phase's own work rewritten
against the new model, and the whole flow live-verified as Learner/Coordinator/Partner Staff. 6 of
7 spec-alignment gaps are resolved; only #6 (automation triggers) remains, paused on a product
decision, and does not block this phase.

Feature #1 (Funding Progress Transparency) needed one real addition during this check: the
original per-course case had a timeline, but the new per-learner master case only got a status
badge for each funding request, not a timeline — added (`FundingRequestTimeline` in
`FundingView.tsx`), live-verified. See the table below for what changed under each feature.

| # | Feature | Hrs | State |
| - | --- | ---: | --- |
| 1 | Funding Progress Transparency | 28 | **Verified, one real gap found and fixed.** Originally confirmed live with the old per-course case. After the #1 architecture split, the new per-course funding request only had a status badge, not a timeline — added `FundingRequestTimeline` (`FundingView.tsx`), same per-phase-with-dates pattern as the eligibility side (`WioaCaseFeed.tsx`). Live-verified: Tile Installation's funding request shows ETPL Training Requested → Training Authorization Pending → Tuition Approved (done, dated) → Apprenticeship Enrollment Complete (future). |
| 2 | Eligibility Self-Check | 20 | **Verified, no new work needed.** `/eligibility` flow confirmed live end-to-end — answer → "You're likely eligible" → "Continue to Funding". Unaffected by the #1 split (doesn't touch the WIOA case tables). |
| 3 | Outreach Email Delivery & Deliverability | 24 | **Done.** `sendWioaOutreach` actually sends (was log-only before), with `replyTo` set to the learner's own address; `sendEmail` retries up to 3 times. The regression found during spec alignment (#7 — a failed send produced zero record) is now fixed: migration `20261125130000_wioa_communication_status` added `WioaCommunication.status`/`failureReason`; both `sendWioaOutreach` and `sendWioaCaseReminder` log a `FAILED` row with the error instead of nothing, and the learner's Outreach log shows a "Failed" badge. **Still blocked**: SPF/DKIM (no DNS access to a verified sending domain, same gap Phase 2 flagged) and bounce handling. |
| 4 | Stalled-Case Detection & Follow-Up | 20 | **Verified against the new model.** `/coordinator/stalled` live-checked post-split (now reads the master case's eligibility status, not a course-case's) — renders correctly, "No stalled cases" is the correct answer for current demo data (the one case changed status today, during migration). Nav link confirmed present. |
| 5 | Funding Impact Reporting | 22 | **Built, verified, and re-verified against the full #1 rewrite.** `getWioaReportingSummary` was split into two aggregation passes — eligibility metrics (phase counts, approval rate, avg days to eligibility) computed once per learner off the master case, funding metrics (approved/requested amounts, conversion rate, avg days to approval) computed per course-case and joined back to its board through the master — specifically so a learner with multiple funding requests no longer inflates the eligibility numbers, which the old per-course aggregation would have done. Live-verified post-rewrite: Reports page still correctly shows "$4.2k approved of $4.5k requested (93%)", by-board breakdown intact. |
| 6 | Document Upload Limits | 8 | **Built, logic unchanged by the #1 split** (`MAX_UPLOADS_PER_DOCUMENT = 10` in `uploadWioaDocument`, now counting against the master case's documents instead of a course-case's — same cap, same mechanism, different FK). Still not live-tested against a real 10-upload sequence — the one item left in this phase with open verification work, not open code work. |
| 7 | Funding Approval Sequencing Fix | 8 | **Built & verified, confirmed still correct post-split.** `validateFundingSequencing` gates `updateWioaFunding`, now called with a course-case id resolved from `wioaCase.fundingRequests?.[0]?.id` (`WioaCaseDetailView.tsx`'s `FundingCard`) instead of the old single-case id. Live-verified the `FundingCard` loads and the save path targets the right record post-rewrite. |

## What's actually left for this phase

- **#6 (Document Upload Limits)**: the only remaining item — exercise a real 10-upload sequence
  against a single document to confirm the cap actually fires. Everything else is built and
  verified.
- SPF/DKIM and bounce handling (feature #3) remain blocked on DNS access NFCAP hasn't provided —
  not something this session can resolve.

## Why nothing here is committed yet (resolved blocker, still not pushed)

Mid-session on 2026-11-25, the user supplied the formal spec this module was meant to be built
against and asked for an alignment check, which found a real architecture question (`WioaCase`
should be one case per student, not one per course) plus six smaller gaps — full list in
`docs/plans/wioa-spec-alignment-kickoff.md`. That architecture question is now resolved: the full
case/course split is built, migrated, and live-verified (see that doc's status section), and 6 of
the 7 gaps are closed. The remaining blocker to pushing is no longer architectural — it's simply
that this work hasn't been committed/pushed/code-reviewed yet. #6 from the spec-alignment doc
(automation triggers) is still open but does not block this phase or a push.
