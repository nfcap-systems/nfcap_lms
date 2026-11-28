# Notifications foundation + WIOA upload-cap handling — kickoff plan

Written 2026-11-27. Covers two coupled tracks, **without Plane connected** — Plane sync is
deferred and will be backfilled from this doc once it's connected (see Step 4). This file is the
local source of truth until then; it is not `tasks/TRACKER.md` and is never a substitute for it.
Same approach as `docs/plans/phase-3-and-design-migration-kickoff.md`.

**Why one file for two tracks:** `CAP-3` ("tell the case manager a learner is stuck") cannot be
built until `NOTIF-0`/`NOTIF-1` exist. That dependency is the whole reason this is one piece of
work; splitting it across two files would hide the only thing that actually constrains the order.

## What this closes and opens

- **Closes Phase 5's last open item** — feature #6 (Document Upload Limits, 8h) has been built
  since 2026-11-25 but never verified. `CAP-5` verifies it. See `docs/build/PHASE_5_PROGRESS.md`.
- **Opens Phase 6's Notification Coverage Completion** (18h) — schema and CRUD exist, nothing
  calls them, no UI. `NOTIF-0`–`NOTIF-3` build it out. See `docs/build/PHASE_6_PROGRESS.md`.

## Decisions recorded (do not reopen)

### 1. Two notification panels, not one — decided 2026-11-27

The learner uses `LearnerShell` (top header, centered content); Admin/Coordinator/Partner Staff
share `AppShell` (left sidebar, full width). Both already render a bell in the top bar; neither
bell opens anything, because the panel was never designed or built.

The two roles need genuinely different panels:

| | Learner | Staff |
| --- | --- | --- |
| Content | evidence reviewed, document rejected, deadline upcoming | upload-cap flags, stalled documents, new messages |
| Volume | a few a week | potentially dozens a day |
| Needs | read it | filter it, jump to the case, clear the queue |

**Two panels, two boards.** Explicitly to avoid repeating `CLAUDE.local.md` mistake #1 — a shared
view that rendered correctly for two roles and was still wrong for one of them, caught only by
clicking through it by hand. A shared panel is not to be introduced later "to simplify" without
revisiting this decision.

### 2. In-app only, no email — decided 2026-11-27

Notifications are an in-app bell with an unread count. Nothing is emailed.

Email is not a starting point: there is no verified sending domain (no DNS access, the same
blocker `docs/build/PHASE_2_PROGRESS.md` flagged), so delivery is restricted to one test address
and bounce handling has nowhere to land. Building email notifications first means building
something that cannot be tested and that nobody receives.

In-app needs no DNS, no external service, and most of the code already exists in this repo. When
DNS arrives, email becomes a second delivery channel reading the same emit points — not a rebuild.

**This also closes `docs/plans/wioa-spec-alignment-kickoff.md`'s gap #6**, which was paused on a
product decision between (A) passive dashboard lists and (B) real notifications. In-app is B
without email's blocker. Gap #6 is decided; the remaining work under it is `NOTIF-3`.

### 3. The staff action and learner history are normal capability, not defect remediation — decided 2026-11-27

Nothing is in production (`stage` has never been promoted to `main`) and no learner has ever hit
the cap. There is no live flaw. What exists is an **incomplete feature during pre-launch build**:
the cap was built, the staff-side management of it was not.

Therefore: **not reported to NFCAP, not raised as a scope increment.** Built as part of finishing
the document checklist properly. Recorded here so a future reader can tell this was a deliberate
decision rather than something nobody noticed.

This shapes the build, not just the paperwork:

- **Do not call it an "override," "reset limit," or "unblock."** That language implies something
  went wrong and a human forced past it. Name it as an ordinary staff action beside Accept and
  Reject: **"Allow another upload"** / **"Request a new file."**
- **Rewrite the learner-facing copy.** The current message ("this document has already been
  uploaded 10 times, the most we allow") reads as hitting a wall. It should read as the process
  working — see `CAP-1`.
- **`CAP-6` is promoted from deferred to planned.** If the learner can see her own upload history,
  she stops anxiously re-uploading, and almost nobody reaches ten. The cap becomes an invisible
  safety net rather than something users encounter.

**What must still be true:** the audit logging in `CAP-2` and `CAP-4` matters *more* under this
decision, not less. WIOA is federally funded and auditable; a staff member granting extra
submissions on an eligibility document is exactly the action an auditor would want a trail for.
That trail is internal and invisible to NFCAP, and it is what makes building this quietly safe.

## Deviations from `docs/DEV-APPROACH.md` consciously accepted

- No Plane ticket exists for any of this work — backfilled later (Step 4). Local IDs
  (`NOTIF-*`, `CAP-*`) are used instead and mapped 1:1 at backfill.
- Building before the full NFCAP-6 gate (all mockups) is approved — only the two boards this work
  needs get approved (Step 0), same carve-out Phase 3 took.

**The lead/builder split holds for every ticket except `NOTIF-1`.** A planning session writes the
briefs, a separate executor session builds; the lead does not build. That was the original
intent for this whole plan, and it still governs `NOTIF-0`, `NOTIF-2`, `NOTIF-3` and every `CAP-*`
ticket.

**Deviation, accepted 2026-11-27 — the executor drew Step 0's two notification panel boards, not
the lead.** For `NOTIF-1` only, the builder has drawn the boards its own work is then checked
against, which collapses the lead/QC split for that one ticket: the artefact and the thing
measuring it come from the same session. Recorded rather than glossed, because
`CLAUDE.local.md` #1 is the cost of a per-role component nobody checked against its own board,
and this is the condition under which that failure mode is likeliest to recur. Mitigation is
the approval, not the drawing — the boards were reviewed and approved by the lead (see Step 0),
so the gate is satisfied by a second pair of eyes even though the drawing wasn't. `NOTIF-1`'s
"Not verified" list should be treated as load-bearing when it lands.

**Deviation, decided 2026-11-27 by Sadin — the lead/QC session is closed; one session now plans,
builds, and checks its own work for the remainder of this plan.** This drops the two-session split
entirely, not just for one ticket the way the `NOTIF-1` deviation above did. Grounds: the remaining
tickets (`NOTIF-2`, `CAP-3`, `NOTIF-3`, and whatever `CAP-4`/`CAP-6` turn into once their boards are
drawn) are small and fully specified, so a second pair of eyes buys less than it costs in session
overhead at this point in the plan. Mitigation: the "Not verified" list on every PR from here on is
the only QC that exists — it has to be treated as the real gate, not a formality, and anything
genuinely unverified has to be written as unverified rather than rounded up to done. If scope grows
past what fits this description, the two-session split is the default to return to, not something
to re-litigate ticket by ticket.

## Ticket IDs

Stable local IDs, because work is handed to a separate session and must be referenceable in chat,
a branch, and a commit — and must map cleanly when Plane is connected.

| ID | Ticket | Track | Board-gated? |
| --- | --- | --- | --- |
| `CAP-1` | Expected failures in `uploadWioaDocument` return instead of throw; rewrite learner copy | Fix | No |
| `CAP-2` | Audit-log the cap event | Fix | No |
| `CAP-5` | Test that the cap fires | Fix | No |
| `NOTIF-0` | Split the emit path (internal `emitNotification`) | Phase 6 | No |
| `NOTIF-1` | Two notification panels (learner + staff) | Phase 6 | **Yes** |
| `NOTIF-2` | First real emitter (`EVIDENCE_REVIEWED`) | Phase 6 | No |
| `NOTIF-3` | WIOA follow-up triggers emit notifications | Phase 6 | No |
| `CAP-3` | Flag capped documents to staff | Phase 6 | Amendment |
| `CAP-4` | "Allow another upload" staff action | Fix | Amendment |
| `CAP-6` | Learner-visible upload history | Fix | Amendment |

Branches are descriptive, not `NFCAP-n`, since no ticket number exists yet — same as Phase 3
(`feature/phase3-1-evidence-storage`). Step 4 renames any still-unmerged branch.

## Step 0 — Boards (executor track)

Drawn by the executor session, not the lead — see the recorded deviation above.

**Required before `NOTIF-1` is built — now satisfied:**

- `ADM18-NotificationsPanel` — staff shell. Had a row in `docs/MOCKUP-INDEX.md` with status `new`
  that existed only to reconcile the index with the live canvas, with the board itself undrawn;
  the index listed it under missing interaction/state boards. Now drawn.
- A learner equivalent for `LearnerShell` — did not exist in the index at all. Now drawn, assigned
  the id `LRN18-NotificationsPanel`, and given a row in `docs/MOCKUP-INDEX.md` (commit `2c4cbb1`,
  pushed straight to `stage` as a docs-only change).

Each board needs **list, empty, read/unread and phone states**, per `DEV-APPROACH.md` line 50.

**Amendments to already-drawn boards** (re-approval required, per `DEV-APPROACH.md`'s "a change to
an approved board needs a new approval"):

- The staff WIOA case detail screen — a new "Allow another upload" action on a document (`CAP-4`)
- The coordinator follow-up queue — a new row type for capped documents (`CAP-3`)
- The learner funding page — upload history on a document (`CAP-6`)

**Note on the bell itself:** `docs/MOCKUP-INDEX.md` records that the clone this design pattern
came from has no standalone topbar bell — its notifications live in the avatar dropdown. The NFCAP
bell-with-red-dot is our own addition, deliberately, and flagged there so it isn't later mistaken
for a clone-matched element. Re-confirm the placement when drawing what it opens.

**Approval mechanism:** the canvas's comment system is `composer_only` — Claude can reply to a
thread the user activates but cannot originate a comment. So verbal approval logged in this file
is the record, same as Phase 3's Step 0. If a canvas-side comment is wanted for the official
trail, the user adds it by hand.

**Status: drawn and approved 2026-11-27.** Approval is the lead's, given verbally and logged here
per the mechanism above — that is the record, and it is what satisfies `NOTIF-1`'s board gate
despite the executor having drawn the boards. No canvas-side comment was added.

**Closed from Step 0:** the learner board's id and its `docs/MOCKUP-INDEX.md` row, both landed in
`2c4cbb1`. `MOCKUP-INDEX.md`'s own maintenance rule is the one this plan has already drifted
against once (see the Phase 5 line in `CLAUDE.md`), so closing it same-day rather than letting it
sit is the right call.

**Still outstanding from Step 0** (does not block `NOTIF-1`): the three board *amendments* below
are not drawn or approved, so `CAP-3`, `CAP-4` and `CAP-6` stay blocked on them.

**`CAP-3`'s amendment — drawn 2026-11-28, scope decision closed, content not yet approved.**
Scoping `CAP-3` found that `RPT02-FundingImpact.dc.html` didn't show the Follow-Up Queue section
at all, even though it's real and live on `/coordinator/reports` and `/partner/reports`
(`WioaReportsView.tsx`, ~line 273) with 5 reason types already built. Sadin was asked full
reconciliation (all 6 reason types, one pass) vs. a minimal bolt-on (just the capped-document
case) — **chose full reconciliation**, same reasoning the brief already carried: a half-fixed
board recreates the board-vs-real-route mismatch `CLAUDE.local.md` #1 burned a session on. The
board now has the whole section drawn, all 6 rows (`DOCUMENT_REJECTED`, `NO_RESPONSE`,
`DOCUMENTS_PENDING`, `ELIGIBLE_NO_FUNDING`, `APPOINTMENT_UPCOMING` from
`determineWioaFollowUpReason`, `src/lib/wioa/follow-up.ts`, plus the 6th — `CAP-3`'s new
capped-document row, labeled as not-yet-built in the board's own caption), matching the real
component's row markup (learner name, course · reason, status badge, chevron) and using existing
shared classes (`.dtcard`, `.ov-h`, `.badge-pending`) rather than inventing new CSS. Published to
the canvas 2026-11-28 (version 215, version id `1795861439-e0b1`).

**What's closed vs. still open:** the *scope decision* (full reconciliation) is closed — don't
reopen it. The *drawn content itself* has not been visually reviewed or verbally approved by
Sadin yet — that review is still the gate `DEV-APPROACH.md` requires before `CAP-3` code starts.
Don't start `CAP-3`'s `emitNotification` call believing the board gate is satisfied; only the
scope-approach question is.

**`CAP-4`'s amendment — drawn 2026-11-28, content not yet approved.** The kickoff doc's own
earlier note ("the staff WIOA case detail screen — `CRD02-CaseDetail.dc.html` or
`CRD03-DocumentReview.dc.html`, check which one actually renders document-level actions") was
checked before drawing: `CRD02-CaseDetail` only has a summary panel ("Documents (5) · 4 accepted,
1 awaiting review" + a "Review documents" button to leave the page); `CRD03-DocumentReview` is the
one with the real per-document rows and actions (View file / Accept / Reject), matching the real
`DocumentReviewRow` component (`WioaCaseDetailView.tsx`). `CRD03` is the right target. Added a
"Proof of Income" row modeling a capped document (10/10 uploads, status Rejected, an explicit
problem-tone note) with an "Allow another upload" button beside the existing actions — not
"override" or "reset limit" wording, per Decision 3. Published 2026-11-28 (version 216, version id
`1795862092-baeb`).

**`CAP-6`'s amendment — drawn 2026-11-28 on a *different* board than the one named in the
original brief, content not yet approved.** The brief said `LRN10-FundingStatus.dc.html`; checking
it against the real code first (same discipline as `CAP-4`'s check, and the exact habit
`CLAUDE.local.md` #1 exists to enforce) found that board has no per-document rows at all — just an
"Outreach log" card and a "View document checklist →" link out to a different board. The real
learner-side component (`DocumentCard`, `src/app/learner/funding/WioaCaseFeed.tsx`) matches
`LRN10c-DocumentChecklist.dc.html`'s row shape (`.docrow`: requirement name, status badge,
file name, upload/re-upload button) exactly — not `LRN10`'s. **`LRN10c`, not `LRN10`, is the real
target**, and it's what got amended: added a "View upload history" toggle under the Photo ID row
(the one with real history in this mock — two prior rejected attempts), display-only, since each
past upload already persists as a `WioaDocumentVersion` row with nothing new to model, mirroring
the staff side's existing "View past versions" pattern. Published 2026-11-28 (version 217, version
id `1795862170-4aea`). **Correct the board name wherever `CAP-6` is referenced below and in any
future ticket/brief — `LRN10c-DocumentChecklist`, not `LRN10-FundingStatus`.**

**All three amendments reviewed and approved — 2026-11-28.** Sadin reviewed and approved
`RPT02-FundingImpact` (`CAP-3`, version 215), `CRD03-DocumentReview` (`CAP-4`, version 216) and
`LRN10c-DocumentChecklist` (`CAP-6`, version 217, corrected target board) as drawn, verbally,
logged here per the same mechanism as Step 0 above — no canvas-side comment added. **The board
gate is now satisfied for all three; `CAP-3`, `CAP-4` and `CAP-6` are unblocked and ready to
build.**

## Step 1 — The fix track (buildable immediately, no design dependency)

`CAP-1`, `CAP-2`, `CAP-5`. Full brief: `docs/plans/executor-brief-cap-1-2-5.md`.

One branch, three commits, one PR — per the 2026-11-22 decision to bundle into fewer, larger PRs
because each CI run plus a blue/green `stage` deploy costs 5–20 minutes.

```
Branch: fix/wioa-upload-cap-handling   (off origin/stage)
PR:     one, to stage
```

**No schema change in any of the three.** Nothing touches `schema.prisma`, so none of
`CLAUDE.local.md` #8's unapplied-migration risk applies. That is deliberate and is why these go
first.

**`WioaActionResult` and the error-handling convention are already on `stage`** (`50a975c`, merged
via PR #34, 2026-11-27), with its tests in `c24eac1`. `CAP-1` applies an established pattern to
one more action rather than introducing one.

## Step 2 — Notification foundation

Blocked on Step 0 for `NOTIF-1` only; `NOTIF-0` can start any time.

**`NOTIF-0` — split the emit path.** `createNotification` (`src/lib/actions/notifications.ts:19`)
is gated to `ADMIN`/`WIOA_COORDINATOR`. That is correct for a directly-callable `'use server'`
export — it stops any signed-in user writing into another user's feed. But it makes the function
**unusable for system-generated notifications**, because the acting user is often a learner: when
a learner hits the upload cap, `requireUser` + the role check throws and the coordinator is never
told. Split into an internal, un-gated `emitNotification` for server-side callers, keeping the
role-gated export as the only externally reachable door. Every other notification is blocked on
this.

**`NOTIF-1` — the two panels.** Build against a real emitter so the list is not empty while being
developed. Data layer already exists: `getNotificationsForUser`,
`getUnreadNotificationCount` (`src/lib/data/notifications.ts`). Read path exists too:
`markNotificationRead`, mark-all-read. Nothing calls any of them.

**`NOTIF-2` — first real emitter.** `EVIDENCE_REVIEWED`. Highest-value notification in the product
(a learner waiting on assessment genuinely wants to know) and the enum value already exists, so no
migration. Proves the loop end to end.

**`NOTIF-3` — WIOA triggers.** The five existing `followUpQueue` entries
(`getWioaReportingSummary`, `src/lib/data/wioa.ts`) emit notifications to the coordinator instead
of only sitting on a dashboard. While in there, close the two remaining pieces of spec gap #6:
add the missing **upcoming-appointment reminder** trigger, and fix the **calendar-vs-business-day**
bug (the no-response trigger counts 3+ calendar days; the spec says business days, so a Friday
email flags as stalled on Monday).

**Needs a migration:** `NotificationType` has no value fitting the cap event — the closest,
`CASE_STATUS_CHANGED`, would be a lie. Adding one is a schema change. Per `CLAUDE.local.md` #8,
generate **and apply** it before any code depends on it; per #3, restart the dev server after
`prisma generate` or a stale in-memory client throws a phantom "Invalid value for argument".

## Step 3 — Cap handling that depends on notifications

**Built 2026-11-28, PR #40 (`feature/cap-3-4-6-capped-document-handling`) merged to `stage` via
merge commit `0f4c537` — On Stage, not Done; `stage` has still never been promoted to `main`.
Merged on the user's explicit instruction, ahead of Anish's review — `CLAUDE.md`'s
approver-is-never-the-pusher rule was flagged before merging and the user confirmed twice to
proceed anyway; worth a look from Anish after the fact rather than before.** `CAP-3` ended up as a
6th reason code on the existing
`determineWioaFollowUpReason`/`followUpQueue`/sweep machinery rather than a standalone
`emitNotification` call — simpler, and it means the sweep's dedupe/recipient logic didn't need
touching at all. `CAP-4` used the schema decision below. `CAP-6` needed its own learner-scoped
read functions, not a branch inside the staff-only ones.

**`CAP-3` detail:** new `UPLOAD_CAP_REACHED` reason code in `determineWioaFollowUpReason`
(`src/lib/wioa/follow-up.ts`), checked first so it outranks `DOCUMENT_REJECTED` — a capped
document is usually also rejected, but "ask the learner to resubmit" doesn't work for it. Wired
into both `getWioaReportingSummary`'s `followUpQueue` and `runWioaFollowUpNotificationSweep`
(`src/lib/actions/wioa-notifications.ts`). Reuses the existing `WIOA_FOLLOW_UP_NEEDED`
notification type — no new migration for this part. New `src/lib/wioa/constants.ts`
(`MAX_UPLOADS_PER_DOCUMENT`/`effectiveUploadLimit`) shared with `CAP-4` so the cap number can't
drift between the two. Unit tests added to `tests/unit/wioa-follow-up.test.ts`.

**`CAP-4` detail:** a nullable `uploadLimitOverride Int?` on `WioaDocument` is preferred over
deleting `WioaDocumentVersion` rows to reset the count — those rows are the audit trail this whole
feature exists to protect, and clearing the counter by destroying them would burn the thing being
guarded. Migration `20261128120000_add_wioa_document_upload_limit_override` generated by hand (no
shadow DB in this sandbox, per `CLAUDE.local.md` #8) and already applied to the live staging DB
via `prisma migrate deploy` — `prisma migrate status` confirms clean. New staff action
`allowAnotherWioaDocumentUpload` raises the override to exactly one past the learner's current
total (never resets or deletes version rows), audit-logged as `WIOA_DOCUMENT_UPLOAD_LIMIT_RAISED`
— distinct from the learner-facing `WIOA_DOCUMENT_UPLOAD_CAP_REACHED` event. "Allow another
upload" button wired into `WioaCaseDetailView.tsx`'s `DocumentReviewRow`, shown only on
`CRD03-DocumentReview`'s Coordinator-facing case detail (Partner Staff's own case-detail component,
`PartnerTraineeDetailView.tsx`, has no document review actions at all yet — a pre-existing gap,
left untouched here). Tests added to `tests/unit/wioa-upload-cap.test.ts`.

**`CAP-6` detail:** `WioaDocumentRecord` gained a server-computed `isCapped` field (data layer,
both `getWioaEligibilityCaseForLearner` and `getWioaCaseDetail`, so neither UI re-derives the cap
math). New learner-scoped `getWioaDocumentVersionsForLearner`/`getWioaDocumentVersionUrlForLearner`
(ownership-checked, deliberately not a branch inside the staff-only
`getWioaDocumentVersions`/`getWioaDocumentVersionUrl` — the access rule is genuinely different,
not just wider) power a "View upload history" toggle wired into `WioaCaseFeed.tsx`'s
`DocumentCard`, mirroring the staff side's existing pattern. `canUpload` now also checks
`!doc.isCapped` so a capped learner sees the "message your case manager" copy instead of a button
that would just fail server-side.

**Verification done vs. not done:** `tsc --noEmit`, `eslint`, and `next build` all pass locally.
Docker is unavailable in this sandbox, so the Vitest suite itself (including the new tests above)
could not be run locally — CI ran it green on PR #40.

**Manually verified by Sadin, 2026-11-28, against real staging data.** `learner@nfcap.demo`'s
"Identity Document" was seeded to 10/10 uploads (9 archived `WioaDocumentVersion` rows +
rejected live file, via a throwaway script run once and deleted, not committed) specifically to
exercise the capped path. Confirmed working: the Follow-Up Queue on `/coordinator/reports` shows
the case with reason "Document upload limit reached — needs staff action" and outranks a plain
rejected reason (`CAP-3`); `/coordinator/[caseId]`'s Documents section shows the problem-tone
notice and "Allow another upload", which raises the limit by exactly one, lets the next upload
through, then re-caps (`CAP-4`); `/learner/funding`'s DocumentCard shows "View upload history"
with the cap message and no Upload/Re-upload button while capped, and the history list shows the
prior uploads (`CAP-6`). Regression (untouched documents' Accept/Reject/Upload) also checked
clean. Seed data cleaned up 2026-11-28 via a second throwaway script (also deleted, not
committed): 10 `WioaDocumentVersion` rows removed (9 from the seed + 1 the real upload flow
created while verifying `CAP-4`), document restored to `ACCEPTED` with `uploadLimitOverride`
back to `null`.

## Progress log (update as each item finishes)

**Accuracy rule — this table is the only thing Step 4's Plane backfill trusts, so it must be
right:** update it the moment a state actually changes (branch created, PR opened, PR merged),
never in a batch after the fact. Verify against real `git`/`gh` state before writing a row, never
from memory. Never write "merged"/"done" without checking the merge actually happened. If a state
is unverified, say so in the row rather than guess.

| ID | Branch | PR / merge commit | State | Date |
| --- | --- | --- | --- | --- |
| Step 0 — two notification panel boards | — | — | Drawn (executor) + approved (lead, verbal) | 2026-11-27 |
| `CAP-1` | `fix/wioa-upload-cap-handling` | PR #35 · `4e8ea89` · merge `0782d5e` | On Stage | 2026-11-27 |
| `CAP-2` | `fix/wioa-upload-cap-handling` | PR #35 · `24a63a3` · merge `0782d5e` | On Stage | 2026-11-27 |
| `CAP-5` | `fix/wioa-upload-cap-handling` | PR #35 · `b0030e8` · merge `0782d5e` | On Stage | 2026-11-27 |
| `NOTIF-0` | `feature/notifications-foundation` | PR #36 · merge `88496bd` | On Stage | 2026-11-27 |
| `NOTIF-1` | `feature/notifications-foundation` | PR #36 · `6f904c5`, `495807f` · merge `88496bd` | On Stage | 2026-11-27 |
| `NOTIF-2` | `feature/notif-2-evidence-reviewed` | PR #38 · merge `ee70625` | On Stage | 2026-11-27 |
| `NOTIF-3` | `feature/notif-3-wioa-follow-up-triggers` | PR #39 · merge `beb3799` | On Stage | 2026-11-27 |
| `CAP-3` | `feature/cap-3-4-6-capped-document-handling` | PR #40 · `f485631`/`9b57808` · merge `0f4c537` | On Stage | 2026-11-28 |
| `CAP-4` | `feature/cap-3-4-6-capped-document-handling` | PR #40 · `f485631`/`9b57808` · merge `0f4c537` | On Stage | 2026-11-28 |
| `CAP-6` | `feature/cap-3-4-6-capped-document-handling` | PR #40 · `f485631`/`9b57808` · merge `0f4c537` | On Stage | 2026-11-28 |
| This kickoff + Phase 6 baseline + defects file | `docs/notifications-and-upload-cap-kickoff` | pushed direct to `stage` through `ad47aaf` | On Stage | 2026-11-27 |
| Sole-session deviation note | `stage` (local) | commit `f6c9d12`, **not yet pushed** — holding behind PR #37 per Sadin | Committed locally | 2026-11-27 |
| Task 0 — staging bell verification | — | n/a (verification, no branch) | Done — see note below | 2026-11-27 |

**What `NOTIF-0`/`NOTIF-1` actually shipped** (PR #36, merged 2026-11-27): an internal
`emitNotification` (`src/lib/notifications/emit.ts`, deliberately *not* a `'use server'` module)
that `createNotification` now delegates to while keeping its own role gate — so system-generated
notifications are no longer blocked by the acting user's role. The shared `NotificationsMenu` is
gone, replaced by `LearnerNotificationsBell` and `StaffNotificationsBell` per Decision 1, both fed
by server-only resolvers under their own `Suspense` boundary, both with an unread badge —
`getUnreadNotificationCount`'s first caller. Mark-read failures are caught at all four call sites
and surfaced as a toast rather than a swallowed `Minified React error #441`, per `CLAUDE.md`'s
error-handling convention.

**Two things that came out of it, neither actioned:**

- `src/components/layout/Header.tsx` and `AppShell.tsx` are dead code — unreachable from any route
  since coordinator/partner moved onto the admin-ui shell. PR #36 wired a static placeholder bell
  into them rather than deleting them, deliberately and with a comment saying so. Needs a cleanup
  ticket; belongs in `docs/build/DEFECTS_AND_HARDENING.md`, not in a feature PR.
- No pixel-level comparison against the `LRN18`/`ADM18` boards was done by the executor, because
  the executor drew those boards (see the recorded deviation). The lead's independent UI check is
  the only verification of that, and it is what gated the merge.

**Task 0 — staging verification (2026-11-27, done after the lead/QC session closed).** Deploy to
Staging run #50 (PR #36's merge, `88496bd`) was green, but per `CLAUDE.local.md` #10 that proves
nothing about the real user path on its own, so this was checked by hand against
`https://dev-nfcap.corecloud365.com`, not just the Actions log:

- Confirmed the deployed app is a real production build, not dev mode — static chunk URLs are
  content-hashed (`05vwmfaw7orbg.js`), no `webpack-hmr`/Fast Refresh traffic. (An earlier pass
  through this check briefly looked otherwise; that turned out to be `agent-browser` reusing a
  stale local tab still pointed at `localhost:3000` from this session's own dev-server testing,
  not anything wrong with staging. Recorded so a future reader doesn't chase the same false lead.)
- Learner (`learner@nfcap.demo`) and staff (`coordinator@demo.nfcap.test`) both: bell renders with
  a real unread count, opens the real panel (not a direct URL open), list state shows real rows,
  clicking an unread notification marks it read and navigates to its `link`, badge count updates
  and persists across reload, empty state copy is correct once everything's read, and the phone-
  width (390×844) panel fits the viewport for both roles. Staff-only: All/Unread filter tab
  correctly narrows the list.
- **Not an empty state, and that's expected, not a bug:** the brief assumed staging would show the
  empty state since no real emitter exists yet. Instead it showed the rows `scripts/seed-
  notifications.ts` wrote during local NOTIF-1 development — confirmed with Sadin 2026-11-27 that
  dev and staging share one Supabase project at this stage of the build, so this is expected
  behavior, not a leak between environments or a bug to fix. Flagging it here rather than quietly
  correcting the brief's assumption without saying why it didn't hold.

**`On Stage` is not `Done`.** `CAP-1`/`CAP-2`/`CAP-5` and `NOTIF-0`/`NOTIF-1` are merged to
`stage`; `stage` has never been
promoted to `main` and nothing in this repo is in production. Phase 5 feature #6 (Document Upload
Limits) is therefore *verified*, not shipped — `docs/build/PHASE_5_PROGRESS.md` should say exactly
that and no more.

## Open questions and blocked items

- **Does any document requirement need more than one file? Resolved 2026-11-28 — no.** A slot
  holds exactly **one** live file — each upload archives the previous one. Sadin confirmed the
  single-live-file model is correct as-is: a multi-page/month requirement (e.g. three months of
  pay stubs for "proof of income") gets combined into one PDF before upload, not split across
  slots. `CAP-4` and `CAP-6` build against the existing model — no schema rethink beyond what was
  already planned (`CAP-4`'s nullable `uploadLimitOverride Int?` on `WioaDocument`).
- **Email deliverability** — SPF/DKIM and bounce handling remain blocked on DNS access NFCAP has
  not provided. Decision 2 removes this from the critical path; it is still a launch blocker for
  anything that must reach a real inbox.
- **Is the retention sweep's cron actually running?** `runDataRetentionSweep`
  (`src/lib/actions/retention.ts`) only destroys documents for cases that ended
  `CLOSED_INELIGIBLE` past the retention window — correct, but it means that for every learner who
  succeeds, files are kept permanently, and the upload cap is the only bound that exists on active
  and approved cases. A `chore/disable-data-retention-cron` branch exists; confirm current state.
- **Which `gh` account is authenticated.** `01447cd` records drift to `anishb-nepa`; the standing
  rule is `manjila-tech` for this repo, matching commit authorship and the
  approver-is-never-the-pusher rule. Confirm before the executor opens a PR, or the author and the
  approver are the same person.

## Estimate risk, recorded rather than buried

Notification Coverage Completion is scoped at **18h**. What is planned into it: two panel boards
with four states each, two panels built, the emit-path split, three emitters, the
appointment trigger, the calendar/business-day fix, and `CAP-3`.

That is plausibly more than 18h. Recorded here so the overrun lands in
`docs/build/PHASE_6_PROGRESS.md` with a reason attached, rather than the feature reporting "done,
18h" while having consumed more. Phase 5 feature #6's small overrun from `CAP-1`–`CAP-6` is
recorded the same way, per decision 3.

## Step 4 — Backfill into Plane, once connected

1. Create tickets for every `NOTIF-*` and `CAP-*` ID above, from this doc — not guessed from
   commit history.
2. Record the `NOTIF-*`/`CAP-*` → `NFCAP-n` mapping in a table here, so this doc stays readable
   after the rename.
3. Set each ticket to its **true current state** (In Progress / On Stage / Done) — never Done
   without proof it is live in production.
4. Rename any still-unmerged branch to the real `NFCAP-n`; retitle any open PR to `NFCAP-n: …`.
5. For anything already merged, add a ticket comment linking the PR/merge commit instead of
   retitling it.
6. Run `/project-pm sync` to regenerate `tasks/TRACKER.md` from the now-real Plane state.

## Resume prompt for the next session

```
Read docs/plans/notifications-and-upload-cap-kickoff.md first — it is the local source of truth
for this work (Plane is not connected; see Step 4).

Three decisions are closed and must not be reopened: two notification panels (not one shared),
in-app notifications only (no email until DNS exists), and the staff upload action + learner
upload history are built as normal capability with no client conversation (see Decision 3 for how
that shapes naming and copy).

State as of 2026-11-27, end of day:

- Five of the ten tickets are On Stage, not Done — nothing is in production.
  CAP-1/CAP-2/CAP-5 merged via PR #35 (merge 0782d5e), closing Phase 5 feature #6.
  NOTIF-0/NOTIF-1 merged via PR #36 (merge 88496bd) — the emit path is split and both
  notification panels are live on stage with unread badges.
- Step 0 is closed: both boards drawn and approved, LRN18-NotificationsPanel indexed in 2c4cbb1.
  The boards were drawn by the executor rather than the lead; that deviation and its mitigation
  are recorded in the deviations section.
- CAP-3 is now unblocked and is the smallest remaining piece — one emitNotification call plus a
  follow-up-queue row. NOTIF-2 (EVIDENCE_REVIEWED emitter) is unblocked and has no migration.
  Neither is briefed; only this file's Step 2 and Step 3 describe them.
- NOTIF-3 is unblocked but needs a NotificationType migration, plus the two WIOA spec gaps folded
  in (the missing upcoming-appointment trigger, and the calendar-vs-business-day bug). Per
  CLAUDE.local.md #8, generate AND apply the migration before writing code against it; per #3,
  restart the dev server after prisma generate.
- CAP-4 and CAP-6 stay blocked — their board amendments are still undrawn, and the open product
  question below may change their shape entirely.
- Loose end from PR #36, not actioned: Header.tsx and AppShell.tsx are dead code with a
  placeholder bell wired in. Needs a cleanup ticket in docs/build/DEFECTS_AND_HARDENING.md.

The one unanswered product question that outranks everything: does any WIOA document requirement
need more than one file? A slot holds exactly one live file today. Ask NFCAP before building
CAP-4 or CAP-6.
```
