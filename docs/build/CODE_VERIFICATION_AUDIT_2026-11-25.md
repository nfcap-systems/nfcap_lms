# Code verification audit — 2026-11-25

Why this exists: the Phase 5 resume brief (written earlier this session) and the client scope
doc's phase labels for Phases 6–8 ("not started") were taken at face value when planning what to
do next. Before starting Phase 5, every claim was re-checked against the actual code — not the
docs' own claims about themselves — using five parallel code-search passes. This file is the
record of that check. Treat it as a snapshot of 2026-11-25; re-verify before trusting it on a
later date, the same way its own existence argues against trusting any other status doc blindly.

**Headline correction:** `CLAUDE.md`'s prior claim "Nothing in Phases 4–8 has started" was wrong
for Phase 6 specifically, and incomplete for Phase 5. Phases 7 and 8 are close to the floor, as
labeled, with small real exceptions in each.

## Phase 5 — Funding Module Productisation (130h, 7 features)

| # | Feature | Resume brief claimed | Verified | Evidence |
|---|---|---|---|---|
| 1 | Funding Progress Transparency (28h) | Built | **Confirmed built** | `src/app/learner/funding/page.tsx` → `FundingView.tsx` |
| 2 | Eligibility Self-Check (20h) | Built | **Confirmed built** | `/eligibility` route, `submitEligibilityCheck` (`src/lib/actions/eligibility.ts:20-39`), rate-limited |
| 3 | Outreach Email Delivery & Deliverability (24h) | Partial | **Confirmed partial** | `src/lib/email.ts:8-11,30` sandbox `EMAIL_FROM`; `:37-39` throws on failure, no retry/bounce handling |
| 4 | Stalled-Case Detection & Follow-Up (20h) | Backend only, zero UI | **Wrong — built end-to-end** | `src/app/coordinator/stalled/page.tsx` + `StalledCasesView.tsx` (258 lines) is live, reading real `getStalledCases` (`src/lib/data/wioa.ts:267-281`, 14-day threshold). The "no UI" claim traced to a stale comment on a dead, unused duplicate file, `src/lib/data/stalledCases.ts:27-52` |
| 5 | Funding Impact Reporting (22h) | Mostly built, no requested-amount field | **Confirmed** | `WioaFundingImpact` (`src/lib/data/wioa.ts:576-808`) feeds all 3 role report pages; schema has `approvedAmount` (`prisma/schema.prisma:724`) only, no `requestedAmount` |
| 6 | Document Upload Limits (8h) | Not built | **Undersold — partial** | `src/lib/rate-limit.ts` is already applied to evidence submission specifically (`src/lib/actions/progress.ts:147,239`, 20 req/15min) — time-windowed, not a true per-document count cap, but not "nothing" |
| 7 | Funding Approval Sequencing Fix (8h) | Partial | **Confirmed partial** | `updateWioaFunding` (`src/lib/actions/wioa.ts:526-565`) upserts `EtplFundingRequest`/`FundingAuthorization` with no ordering check; gap also named in `docs/HANDOFF.md:156-157` |

**Impact on Phase 5 worklist:** drop "build Stalled-Case UI" entirely — it exists. Document Upload
Limits is "harden an existing limiter into a real per-document cap," not "build from zero."

## Phase 6 — Communication & Operations (184h, 8 features) — labeled "Not Started": stale

| # | Feature | Verified reality |
|---|---|---|
| 1 | Trainee ↔ Staff Messaging (36h) | Partial — full schema + server actions (`startThread`, `sendMessage`, `markThreadRead`, RLS-scoped) exist in `src/lib/actions/messaging.ts`, whose own comment says "No UI wired to these yet." Zero UI anywhere in `src/app`/`src/components`. |
| 2 | Announcements (14h) | **Built & working.** Schema `prisma/schema.prisma:866-876`; admin authoring `src/app/admin/announcements/AnnouncementsView.tsx`; learner banner in `src/app/learner/HomeView.tsx` (`markAnnouncementRead`). Full loop confirmed. |
| 3 | Notification Coverage Completion (18h) | Schema + CRUD only (`src/lib/actions/notifications.ts`), own comment confirms nothing calls `createNotification` yet, no panel UI. **Not the same thing** as the recent "toast notification system" commit — that's `src/components/ui/Toaster.tsx`/`sonner`, ephemeral client-side toasts, unrelated to the persisted `Notification` model this feature covers. |
| 4 | Bulk / CSV Enrollment (18h) | **Built & working.** `bulkEnrollLearners` (`src/lib/actions/data-io.ts:109-161`), batched, audit-logged, scoped to existing accounts + OPEN courses only. |
| 5 | Cohorts & Deadlines (24h) | Partial — `Cohort`/`CohortMembership` built with real admin UI (`src/app/admin/cohorts/CohortsView.tsx`); `CohortDeadline` model exists in schema with **no UI** anywhere. |
| 6 | Admin Reporting Depth (28h) | **Not built.** `src/app/admin/analytics/page.tsx` is a literal `AdminPlaceholderScreen`. `EnrollmentSnapshot` model exists, unused by any reader or writer. |
| 7 | Data Export (14h) | **Built & working.** `exportLearnersCsv`/`exportEvidenceReviewHistoryCsv`/`exportWioaCasesCsv` (`src/lib/actions/data-io.ts:29-107`), audit-logged. |
| 8 | Quiz Engine Depth (32h) | Partial, with an active regression — question-bank/randomization/attempt-limit logic is real (`src/lib/data/quiz.ts:41-79`: bank draw, Fisher-Yates order, `maxAttempts`), but the live learner flow (`src/components/learner/QuizFlow.tsx`) bypasses it entirely: fixed question order, and **reveals the correct answer on every result screen** (`QuizFlow.tsx:342`) regardless of attempts remaining — the opposite of what this feature requires. `maxAttempts` is displayed but not enforced. |

**Net for Phase 6:** 2/8 fully done (Announcements, Data Export), 1 done on the admin side only
(Bulk Enrollment), 4 schema+backend-only with no UI (Messaging, Notifications, Reporting Depth,
Cohort Deadlines), 1 (Quiz Engine Depth) has a wiring gap *plus* a live answer-leakage bug that
needs fixing, not just finishing.

## Phase 7 — Accessibility (102h, 6 features) — mostly genuinely not started

| # | Feature | Verified reality |
|---|---|---|
| 1 | Confirm the Accessibility Obligation (8h) | Not started. |
| 2 | Accessible Drag-and-Drop Reordering (20h) | Cosmetic only — `PathwayView.tsx:127` has an `aria-label` implying keyboard reordering, but the dnd-kit sensor setup (`:32`) only wires `PointerSensor`, no `KeyboardSensor` — mouse-only in practice. |
| 3 | Dialog & Drawer Focus Handling (14h) | Split — `src/components/ui/Dialog.tsx` is solid (native `<dialog>` + `showModal()`, free focus trap/Escape/inert-background). `src/components/ui/Drawer.tsx` is a plain `role="dialog"` div with **no** focus trap, initial-focus move, Escape handler, or focus restoration. |
| 4 | Colour Contrast & Token Audit (16h) | **Actually done.** `docs/design/NFCAP_DESIGN_SYSTEM.md:89-98` documents real WCAG AA fixes with computed ratios (e.g. badge text to `#9E1015`, ~7.2:1; focus ring >12:1). |
| 5 | Semantics, Labels & Keyboard Pass (28h) | Not built — only 42 files use any `aria-*` at all, 22 `role=`, scattered/incidental, not a systematic pass. `docs/build/SESSION_NOTES.md:137-138` itself flags a defect as "exactly what Phase 7 exists to catch systematically — not fixed elsewhere now, flagged." |
| 6 | Screen Reader Journey Testing (16h) | Not built — no axe/jest-axe dependency, no a11y test files anywhere. |

## Phase 8 — Performance, Hardening & Launch (116h, 6 features) — genuinely not started

| # | Feature | Verified reality |
|---|---|---|
| 1 | Load Testing & Database Tuning (24h) | Not built — no load-test tooling/scripts anywhere. |
| 2 | Caching & Media Delivery (16h) | Partial — `cacheComponents: true` is live (`next.config.ts:19`); Redis/`cacheTag`/`'use cache'` explicitly not implemented yet, matching `CLAUDE.md`'s own existing claim (blocked on the WIOA-consumer audit). |
| 3 | Independent Security Review (20h) | Not built — no review/audit docs, no CodeQL/Snyk step in CI. |
| 4 | Runbook, Monitoring & Incident Process (16h) | Partial — Sentry is real and wired (`src/sentry.server.config.ts`, `src/sentry.edge.config.ts`, production-gated in `next.config.ts`). No runbook or incident-process document exists. |
| 5 | Workforce Board Data Agreement — Gate (12h) | Not applicable yet — correctly a hard external gate (signature by a third party), not engineering work. Nothing to build until it exists. |
| 6 | User Acceptance Testing & Go-Live (28h) | Not built — no UAT checklist or go-live runbook artifact exists. |

## Phase 0 / 3 / 4 open items — re-checked, all confirmed exactly as previously documented

No quiet progress since the last written status in `PHASE_0_PROGRESS.md`, `PHASE_3_PROGRESS.md`,
`PHASE_4_PROGRESS.md`:

- Staging migration automation is still missing from CI (`package.json`'s `predev`/`db:deploy`
  guard local/agent dev only; no workflow runs `prisma migrate deploy`/`migrate status`).
- No backup/restore tooling exists anywhere (grep returns only doc/prose mentions).
- WIOA sign-off verification evidence genuinely exists (`tests/e2e/wioa-status.spec.ts`,
  `tests/unit/wioa-status.test.ts`) — confirmed present, crediting not re-litigated.
- `prisma/seed.ts` still carries 8 literal `[PLACEHOLDER]` criteria titles (lines 115, 121, 229,
  235, 336, 342, 444, 450); no real criteria content exists anywhere.
- No expiry/renewal code exists (grep hits are all unrelated: session renewal, signed-URL
  expiry, WIOA case/eligibility expiry).
- No QR-code dependency or component exists anywhere (`qrcode`/`qr-code`/`QRCode`: zero matches).

## What this changes about how Phase 5 starts

1. Stalled-Case Detection & Follow-Up (#4) comes off the Phase 5 build worklist — it's done.
   Verify it in the browser with `agent-browser` instead of building it.
2. Document Upload Limits (#6) is a smaller task than scoped — extend the existing
   `src/lib/rate-limit.ts` usage into a real per-document count cap, not a new system.
3. Everything else in the original resume brief's Phase 5 worklist (#3 outreach deliverability,
   #5 impact chart gap, #7 sequencing fix) stands as previously scoped.
4. Phase 6/7/8 findings are **not** in scope for this Phase 5 branch — recorded here so the next
   session (or the next phase kickoff) doesn't have to re-discover them, and so Quiz Engine
   Depth's answer-leakage finding isn't lost before Phase 6 starts.
