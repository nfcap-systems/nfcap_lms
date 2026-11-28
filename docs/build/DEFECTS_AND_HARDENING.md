# Defects and hardening — cross-phase

Created 2026-11-27. **Why this file exists:** every progress doc from `PHASE_0_PROGRESS.md` through
`PHASE_6_PROGRESS.md` is organised per scoped feature, so there has been nowhere to record work
that is not one of the 65 features in
`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`. Real sessions keep producing exactly
that: bug fixes, cross-cutting convention changes, regressions found by audit. Some of it is more
urgent than scoped work. With no slot for it, it goes unrecorded and gets re-discovered later by a
code audit — which is literally what happened on 2026-11-25.

Defects do not respect phase boundaries, so this is one cross-phase file rather than a section in
each phase doc.

**Scope of this file:** defects, regressions, and cross-cutting hardening. Not scoped features
(those go in the phase progress docs), and not environment/process lessons (those go in
`CLAUDE.local.md`).

## Open

| ID | Found | Defect | Where | State |
| --- | --- | --- | --- | --- |
| `D-2` | 2026-11-25 | **Quiz reveals the correct answer on every result screen**, regardless of attempts remaining — the exact opposite of what Phase 6 feature #8 requires. `maxAttempts` is displayed but not enforced, and the live flow bypasses the real question-bank/randomization logic in `src/lib/data/quiz.ts:41-79` entirely (fixed question order). | `src/components/learner/QuizFlow.tsx:342` | **Open.** Found by the 2026-11-25 audit, not by a test. Fix belongs with Phase 6 feature #8 but is a defect, not unfinished scope — a learner can currently farm answers by retaking. |
| `D-3` | 2026-11-27 | **Expected-failure Server Actions still throw on data-dependent pages.** `assignWioaCasePartnerStaff` and anything else validating by `throw` on a page whose tree shape varies with its data can have its message replaced by a generic `Minified React error #NNN`. Same mechanism as `D-1`. | `src/lib/actions/wioa.ts` and unaudited others | **Open.** `CLAUDE.md`'s "Error handling convention" says to convert these as they are touched rather than waiting for another live failure. No audit has been done of which actions are still exposed. |
| `D-8` | 2026-11-27 | **`Header.tsx`/`AppShell.tsx` are dead code** — unreachable from any route since the coordinator/partner layouts moved onto the admin-ui shell. PR #36 (NOTIF-0/NOTIF-1) wired a static placeholder bell into them instead of deleting them, deliberately, with a comment saying so. | `src/components/layout/Header.tsx`, `src/components/layout/AppShell.tsx` | **Open.** Cleanup, not urgent — nothing renders these. Delete (or confirm genuinely dead and remove) rather than let the placeholder bell look like real functionality to a future reader. |
| `D-9` | 2026-11-27 | **No idempotency guard on `applyEvidenceStatus`** — double-clicking "Mark complete"/"Mark not met" on an already-approved evidence submission emits a duplicate `EVIDENCE_REVIEWED` notification to the learner. Found live during PR #38 (NOTIF-2)'s verification pass, not fixed there — an admin double-click is an edge case, not a path that ticket needed to close. | `src/lib/actions/progress.ts` (`applyEvidenceStatus`) | **Open.** Fix is a no-op guard when the submission's status already matches the requested status, before emitting the notification. |
| `D-7` | 2026-11-27/28 | **`PTN01-Roster`'s "Follow-ups this week" KPI measures the wrong thing** — it counts whether staff sent a reminder recently, not whether a trainee actually needs one now. No urgency sort, no "needing action today/overdue" flag anywhere in `PartnerRosterView.tsx`, which is what `WIOA_Eligibility_Matching_App_Developer_Specification.pdf` §16 ("Partner / Staff Dashboard") defines this screen as: a follow-up queue sorted by urgency, plus cohort-pipeline stage counts and a document-readiness breakdown (complete/missing/rejected). Checked against the formal spec during a CRD02/CRD03/PTN02 redesign session, found while asking "what is Partner Staff's actual job" — not previously audited against this spec section. | `src/components/wioa/PartnerRosterView.tsx`, `src/app/partner/page.tsx` | **Open, scoped, not started.** The real fix looks like wiring, not new logic: `getWioaReportingSummary` (`src/lib/data/wioa.ts:736`) + the pure, already-unit-tested `determineWioaFollowUpReason` (`src/lib/wioa/follow-up.ts`) already compute `followUpQueue` (urgency-sorted, used by the Reports pages and the notification cron sweep), `phaseCounts` (cohort pipeline, already in the sanitized 4-phase `WIOA_UI_PHASES` names, not raw status codes), and `documentReadiness` (accepted/missing/underReview/rejected) — none of it currently reaches `PartnerRosterView`. Calling it with `{ assignedPartnerStaffId: user.id }` and no `includeFunding` would surface all three without touching funding data. **One open question before building:** spec §16 also wants "Board performance: approval rate, funding conversion" on this dashboard, which directly contradicts the approved scope doc's role table — `"Partner Staff — ... No funding amounts"` (`NFCAP_LMS_Production_Scope_Summary_Client.md:59`). `includeFunding` already makes it trivial to simply omit that part, but the spec-vs-scope-doc disagreement itself is a product question for Manjila/Sadin, not an engineer's call (`docs/DEV-APPROACH.md`). Whether showing `phaseCounts` at all still crosses the project's own "no WIOA jargon for Partner" decision (`docs/MOCKUP-INDEX.md`) is a weaker but also unconfirmed concern — worth a second look, not an assumption, before this is built. |

## Resolved

| ID | Found | Defect | Where | Resolution |
| --- | --- | --- | --- | --- |
| `D-1` | 2026-11-27 | **A thrown Server Action error was silently swapped for a generic React error.** A coordinator marking a WIOA case eligible with documents still pending got `Minified React error #441` instead of the real validation message, 100% reproducible — hit live during a client demo. Cause was a `cacheComponents` (PPR) resumable-tree mismatch on `/coordinator/[caseId]`, whose tree shape genuinely varies with case data; when a Server Action on such a page throws, the broken reconciliation swallows the message. The business logic was correct the whole time. | `src/lib/actions/wioa.ts` | **Fixed 2026-11-27**, `50a975c`, merged to `stage` via PR #34. `advanceWioaEligibilityStatus` and `updateWioaFunding` now return `WioaActionResult` for expected validation failures; only access-control/not-found failures still throw. Tests in `c24eac1`. Produced `CLAUDE.md`'s "Error handling convention" and `CLAUDE.local.md` #11. Follow-on exposure tracked as `D-3`. |
| `D-4` | 2026-11-24 | **A documented access rule was enforced in one route and re-derived wrongly in four UI surfaces**, each rendering a normal-looking "Continue" affordance that dead-ended on the Restricted notice. Also exposed a seed-data bug: completed progress was seeded without the matching `CourseUnlock` grant a real unlock flow would produce. | `HomeView.tsx`, `MyLearningView.tsx` (both tabs), `ExploreCourseCard.tsx`, `seed-demo-learners.ts` | **Fixed 2026-11-24.** Found by clicking through with `agent-browser`, not by reading components. Lesson recorded as `CLAUDE.local.md` #9. |
| `D-5` | 2026-11-23 | **A shared log/model reused for a narrower purpose nearly leaked internal staff notes to learners.** Adding `NOTE` to `CommunicationChannel` and writing Partner Staff notes into `WioaCommunication` would have surfaced them in the learner's own Funding-page outreach log, which read every row for that `learnerId` with no channel filter. | `getWioaCommunications` | **Fixed before shipping 2026-11-23.** Caught by proactively auditing every read site, not by anything failing. Lesson recorded as `CLAUDE.local.md` #6. |
| `D-6` | 2026-11-23 | **Free-text in a data-table cell broke the layout.** A real (not seed-length) follow-up note with no `max-width`/`text-overflow` pushed the Actions column's buttons outside the visible table width. | `PartnerRosterView` | **Fixed 2026-11-23.** Lesson recorded as `CLAUDE.local.md` #5. |

## Planned hardening (not defects)

| ID | Item | Where | State |
| --- | --- | --- | --- |
| `CAP-1` | Convert `uploadWioaDocument`'s expected failures to `WioaActionResult`, and rewrite the learner-facing cap copy so it reads as process rather than a wall. One instance of `D-3`'s class, on a page (`/learner/funding`) with the same data-dependent rendering risk. | `src/lib/actions/wioa.ts:288`, `src/app/learner/funding/WioaCaseFeed.tsx` | **Briefed 2026-11-27**, not started. `docs/plans/executor-brief-cap-1-2-5.md`. |
| `CAP-2` | Audit-log the upload-cap event, so the cap firing is observable at all. | `src/lib/actions/wioa.ts` | **Briefed 2026-11-27**, not started. |
| `CAP-5` | Test that the upload cap actually fires, that no storage object is written when it refuses, and that the boundary is not off by one. Closes Phase 5 feature #6's open verification. | `tests/unit/wioa-upload-cap.test.ts` | **Briefed 2026-11-27**, not started. |

## Conventions for this file

- **One row per defect**, with discovery date, where it lives, and verification state. Never write
  "fixed" without a commit or PR reference.
- **A defect found but not fixed stays in Open** with the evidence, even if it is someone else's
  phase. `D-2` sat in an audit document for two days before this file existed; that is the failure
  mode this file prevents.
- **Fixes that produced a standing rule** link to it — `CLAUDE.md` for conventions that bind new
  code, `CLAUDE.local.md` for process/environment lessons. The rule is the durable artifact; this
  table is the record that it came from something real.
- **Hardening is not a defect.** Work that improves something not yet broken goes in the Planned
  section, so the Open list stays a list of things that are actually wrong.
