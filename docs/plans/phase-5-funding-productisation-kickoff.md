# Phase 5 — Funding Module Productisation — kickoff plan

Written 2026-11-25. Covers starting Phase 5 (Funding Module Productisation ★, 7 features, 130h,
`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` lines ~277-299). Before any code was
written, every feature's claimed status was re-verified against the actual codebase — see
`docs/build/CODE_VERIFICATION_AUDIT_2026-11-25.md` for the full evidence; this file is the
resulting worklist, not a repeat of the evidence.

## Corrected starting point (see the audit doc for file:line evidence)

| # | Feature | Hrs | Verified state | What's actually left |
|---|---|---:|---|---|
| 1 | Funding Progress Transparency | 28 | Built & working | Nothing — verify only |
| 2 | Eligibility Self-Check | 20 | Built & working | Nothing — verify only |
| 3 | Outreach Email Delivery & Deliverability | 24 | Partial | SPF/DKIM, bounce handling, retry/failure-surfacing to staff |
| 4 | Stalled-Case Detection & Follow-Up | 20 | **Built & working** (corrected — prior brief said backend-only; the UI exists at `src/app/coordinator/stalled/`) | Nothing — verify only |
| 5 | Funding Impact Reporting | 22 | Mostly built | Add `requestedAmount` to schema + requested-vs-approved chart, pending the open decision below |
| 6 | Document Upload Limits | 8 | **Partial** (corrected — a time-windowed rate limiter already guards evidence uploads) | Turn it into a real per-document count cap |
| 7 | Funding Approval Sequencing Fix | 8 | Partial | Add the missing sequencing gate to `EtplFundingRequest`/`FundingAuthorization`, mirroring the solid case-status state machine |

**Real remaining engineering:** features #3, #5, #6, #7. Features #1, #2, #4 need only a
browser verification pass (`agent-browser`, per `CLAUDE.md`'s Browser automation section) before
being marked done — not rebuilt.

## Open product questions — do not guess, flag for the user/client

- Stalled-case threshold: 14 days is a placeholder in `getStalledCases`. Needs a real confirmed
  business rule before this is more than "verify it renders."
- Whether to add a `requestedAmount` field to `WioaFunding`/`EtplFundingRequest` to unblock the
  Funding Impact chart — a schema change, so confirm before touching migrations.
- Which workforce boards are needed at launch (only Tri-Valley/Alameda County packet on file) and
  whether California is the only state — affects Outreach Email Delivery's real scope if more
  board-specific templates are needed.

## Process decisions carried over from the original resume brief (unchanged)

- No Plane connection yet — do not create Plane tickets. Progress tracked in
  `docs/build/PHASE_5_PROGRESS.md`, created once something is actually built (not as an empty
  skeleton up front).
- Branch: `feature/phase5-funding-productisation`, bundled into one PR to `stage` covering all 7
  features (not one-branch-per-feature, unlike Phase 3).
- Confirm with the user before merging — UI verify before merge, same as every prior phase; CI
  green is not merge approval.

## Order of work

1. Verify #1, #2, #4 in the browser against real (non-seed-shaped) data — confirm the corrected
   status before building anything, per `CLAUDE.local.md` mistake #1/#9's lesson: a route
   rendering is not the same as it being correct for the actual data shape.
2. Outreach Email Delivery & Deliverability (#3) — SPF/DKIM is partly blocked on DNS access to a
   verified sending domain (same open gap Phase 2 flagged); scope what's achievable without it.
3. Funding Approval Sequencing Fix (#7) — smallest, well-scoped, no open product question blocking it.
4. Document Upload Limits (#6) — small, no open product question blocking it.
5. Funding Impact Reporting (#5) — only once the `requestedAmount` question is answered.

## Also recorded here, out of scope for this branch

The same verification pass found Phase 6 is materially further along than its "Not Started" label
(2/8 features fully built, several more schema+backend-only with no UI) and surfaced a live bug —
`QuizFlow.tsx` reveals the correct quiz answer on every result screen regardless of attempts
remaining. Neither is Phase 5 scope. Full detail in
`docs/build/CODE_VERIFICATION_AUDIT_2026-11-25.md` so it isn't lost before Phase 6 starts.

## Pre-work fix, 2026-11-25 — LRN10-FundingStatus mockup mismatch, done before starting Phase 5

Before touching the worklist above, the built `/learner/funding` page was checked against its
mockup (`docs/MOCKUP-INDEX.md`'s `LRN10-FundingStatus` board, read directly from the design
canvas). Two real mismatches, fixed on `feature/admin-ui-parity-dashboard-learners-audit` (the
branch already checked out, not a new one):

1. **Case status was a flat badge row with no dates**, not the mockup's vertical timeline with
   checkmarks and per-step dates. Fixed in `src/app/learner/funding/WioaCaseFeed.tsx` — now a
   `.tl`/`.tlrow`/`.tldot` timeline (same shared CSS pattern `WioaCaseDetailView.tsx` already uses
   for staff) over the real `WIOA_UI_PHASES` model (6 phases — Registration/Matching/Contact/
   Eligibility Process/Funding Request/Enrollment — not the mockup's 5 differently-named pills,
   which were never reconciled with the actual status model). Needed a new field,
   `WioaCaseRecord.statusHistory`, added to `src/lib/data/wioa.ts`'s `getWioaCasesForLearner`, so
   each completed phase can show the date it was reached. New CSS: `.tlrow.done`/`.tlrow.future` in
   `src/app/design-system.css`.
2. **Header subtitle was generic boilerplate regardless of case**, not the mockup's course name.
   Fixed in `src/app/learner/funding/page.tsx` — now names the learner's default restricted course.

Not changed: the document checklist stays inlined on the page (`WioaCaseFeed.tsx`'s "Eligibility
documents" card) rather than becoming a separate linked page as the mockup's "View document
checklist →" implies — the inline version is real, working, and arguably better UX; this is a
mockup/code drift to reconcile in the docs later, not a product regression to fix now.

Verified live via `agent-browser` as `learner@nfcap.demo` against the dev server on
`localhost:3015` (another session's, reused rather than starting a competing one on 3000) —
screenshots confirmed the new timeline, course-specific header, and that `sendWioaOutreach`'s real
case-creation flow populates it correctly. `tsc --noEmit` and `eslint` both clean on the changed
files.

## Pre-work fix, 2026-11-25 — `/admin/pathway` drag-and-reorder silently not saving

Reported by the user against `https://dev-nfcap.corecloud365.com/admin/pathway`: dragging a course
visually reordered the list, but the reorder didn't actually persist. Root cause confirmed via the
dev server's own log (`.next/dev/logs/next-development.log`), which was already catching this live
before the report: `"Cannot call startTransition while rendering."` thrown from
`PathwayView[handleDragEnd > setOrdered()]`.

`src/components/admin/PathwayView.tsx`'s `handleDragEnd` called `startTransition(...)` **inside**
the callback passed to `setOrdered(...)`. A `setState` updater callback can run during React's
render phase, and `startTransition` itself triggers a state update — calling one from inside the
other is invalid and React throws, which meant `reorderPathway` (the actual persist call) never
ran, even though the drag looked successful.

**Fixed**: compute `next` from the component's own `ordered` closure value instead of a functional
updater, call `setOrdered(next)`, then call `startTransition` as a separate, sibling statement —
not nested inside the state update. Verified via `agent-browser` as `admin@demo.nfcap.test`:
dragged Tile Installation above Trim Freshing, reloaded the page, confirmed the new order
persisted; dragged it back and reloaded again to confirm the demo data was restored to its
original order. `tsc --noEmit` and `eslint` clean.

Not addressed here (tracked separately, Phase 7 scope, `docs/build/CODE_VERIFICATION_AUDIT_2026-11-25.md`):
the drag handle has an `aria-label` implying keyboard support, but no `KeyboardSensor` is wired —
reordering is still mouse/pointer-only.
