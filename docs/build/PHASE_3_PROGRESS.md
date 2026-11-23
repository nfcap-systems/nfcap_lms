# Phase 3 Progress

Working log of Phase 3 execution against
`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` ("Phase 3 — Evidence & Competency ★",
12 features, 260h). Mirrors `docs/build/PHASE_0_PROGRESS.md`/`PHASE_1_PROGRESS.md`/
`PHASE_2_PROGRESS.md`'s convention — update this as status changes.

## Status as of 2026-11-23

**11 of 12 features are built and merged to `stage`.** The one remaining item, Criteria Authoring
Support (NFCAP), is not engineering work — see "What's open" below.

Nothing from Phase 3 is in production. In `docs/DEV-APPROACH.md`'s state model these are **On
Stage**, not **Done**; Done requires being live in production, and `stage` has not been promoted to
`main`.

This file was stale for the whole of the build — it still said "Phase 3 has not started" on
2026-11-23, eleven features in, because each feature session logged into
`docs/plans/phase-3-and-design-migration-kickoff.md`'s progress table and nothing wrote back here.
Brought current 2026-11-23 during feature #12, sourced from that table and `git log origin/stage`,
not from memory. **The kickoff doc's progress table stays the detailed record** (branch, PR, merge
commit, deliberate deviations, per-feature verification notes); this file is the phase-level
summary that `CLAUDE.md` points a new session at.

### Per-feature status

| # | Feature | Hrs | PR / merge commit | State |
| - | --- | ---: | --- | --- |
| 1 | Real Evidence File Storage | 32 | PR #13, `af75626` | On Stage |
| 2 | Image Downscaling & Storage Cost Control | 12 | PR #14, `6c710b4` | On Stage |
| 3 | Per-Course Assessment Criteria | 18 | PR #15, `29c2f20` | On Stage |
| 4 | Criteria Authoring Interface | 24 | PR #16, `7d68319` | On Stage |
| 5 | Criteria Authoring Support (NFCAP) | 12 | — | **Not started — blocked on NFCAP's trade experts, not engineering** |
| 6 | ★ Reviewer Queue | 24 | PR #18, `3e4c5a8` | On Stage |
| 7 | ★ Per-Criterion Review & Gated Certification | 40 | PR #19, `0861664` | On Stage |
| 8 | Photo Annotation | 20 | PR #20, `9481620` | On Stage |
| 9 | Guided Evidence Capture | 28 | PR #20, `9481620` | On Stage |
| 10 | Per-Criterion Feedback & Targeted Resubmission | 24 | PR #21, `091f786` | On Stage |
| 11 | Attempt History | 12 | PR #21, `091f786` | On Stage |
| 12 | Legacy Data & Regression Pass | 14 | PR #22, `518bec7` | On Stage |

### What's open

1. **Feature #5 — Criteria Authoring Support (12h).** Working sessions with NFCAP's trade experts
   to author real assessment criteria. Until this happens, every seeded course carries two
   `[PLACEHOLDER]` criteria from `prisma/seed.ts`, so the gated-certification path — the ★ feature
   of this phase — gates on placeholder text. The mechanism is real and verified; the content is
   not.
2. **Media delivery architecture is still undecided** (see "Dependencies" below). Feature #1 stores
   video in the private evidence bucket and feature #2 deliberately passes video through without
   re-encoding, so nothing is blocked today — but no adaptive-streaming provider has been chosen,
   and that decision was scoped to *this* phase precisely because it gets expensive to change later.
3. **A verification pass across features #8–#12 was planned and did not happen before merge.** In
   particular `LRN06d-EvidenceNotMet`, `LRN06e-EvidenceResubmit` and `LRN06f-AttemptHistory` have
   never been visually compared against their approved boards. Worth closing before `stage` is
   promoted to `main`.
4. **Plane backfill (Step 3 of the kickoff plan) has not been run.** No Phase 3 ticket exists; the
   kickoff doc's progress table is the only record, which is why its accuracy matters.

## What this phase replaces

Today, `Course.evidencePrompt` is a single free-text prompt for the whole course, and
`EvidenceSubmission` is one row per whole-course submission (`description` + an optional
`fileName` — no real file storage, per the schema's own comment: "Display filename only — no real
file storage yet"). `Certificate` is issued 1:1 when that one submission is approved. There is no
"assessment criteria" concept anywhere in the schema. Phase 3 replaces this entire shape with a
per-criterion model: named criteria per course, per-criterion photo/video evidence, per-criterion
Met/Not Met review, and a certificate that's structurally impossible to issue unless every
required criterion is Met.

## The 12 features

| Module | Feature | Hours |
| --- | --- | ---: |
| Evidence Storage | Real Evidence File Storage | 32 |
| | Image Downscaling & Storage Cost Control | 12 |
| Competency Model | Per-Course Assessment Criteria | 18 |
| | Criteria Authoring Interface | 24 |
| | Criteria Authoring Support (NFCAP) | 12 |
| Review | ★ Reviewer Queue | 24 |
| | ★ Per-Criterion Review & Gated Certification | 40 |
| | Photo Annotation | 20 |
| Learner | Guided Evidence Capture | 28 |
| | Per-Criterion Feedback & Targeted Resubmission | 24 |
| | Attempt History | 12 |
| QA | Legacy Data & Regression Pass | 14 |

Full per-feature descriptions, roles, platform, and complexity are in
`docs/client/NFCAP_LMS_Feature_Detail_Client.md`.

## Done when (client's criteria)

All four mechanisms are built and merged. Each is checked for the *mechanism*; none can be called
credible to the client until feature #5 replaces the `[PLACEHOLDER]` criteria with real ones.

- [x] A trainee uploads real photos against each named criterion and cannot submit until all
      required items are captured — feature #9's `GuidedEvidenceCapture` + `submitGuidedEvidence`,
      which enforces `photoRequired` and refuses a submission that skips any criterion still
      needing evidence, server-side
- [x] A reviewer assesses every criterion Met / Not Met with notes pinned on the photo — feature
      #7's `/admin/learners/[learnerId]/review/[courseId]` plus feature #8's
      `PhotoAnnotationDialog`
- [x] ★ A certificate cannot be issued unless every required criterion is Met — enforced
      centrally in `applyEvidenceStatus` (`src/lib/actions/progress.ts`) so every caller passes the
      same gate; driven end-to-end in the browser during feature #12 (refused, then certified once
      every mandatory criterion was Met)
- [x] A rejected trainee sees exactly what failed and re-shoots only that — feature #10's
      `EvidenceNotMet` + carry-forward of already-Met criteria. **Built but not visually verified
      against `LRN06d`/`LRN06e`** — see "What's open" item 3.

## Dependencies / open decisions before (or early in) this phase

1. **NFCAP's trade experts must author the assessment criteria.** The feature is only as credible
   as the criteria — this cannot be substituted with engineering assumptions. Blocks Criteria
   Authoring Support and, practically, blocks Guided Evidence Capture / Reviewer Queue / Per-
   Criterion Review from being usable with real content (though they can be built and tested
   against placeholder criteria in the meantime). **Still open as of 2026-11-23** — all three of
   those features shipped against the placeholder criteria exactly as anticipated here.
2. **Media delivery architecture** — the client doc calls this out as belonging in *this* phase,
   not deferred to launch, because storage architecture is expensive to change once later features
   depend on it. Options named in the doc: Cloudflare Stream (flat per-minute, no egress fees) or
   Mux (per-minute, free monthly allowance, stronger analytics), adaptive HLS either way. **Still
   not decided as of 2026-11-23.** Feature #1 stores video in the private evidence bucket and
   feature #2 passes video through unmodified, which keeps the decision open without blocking
   anything built so far.
3. ~~**Image optimization is a self-hosting cost, not a managed-platform one.**~~
   **Resolved by feature #2** (PR #14, `6c710b4`): JPEG/PNG evidence is downscaled to a 2000px
   long edge and recompressed at upload time inside `uploadEvidenceFile`, never per request, per
   `docs/build/PERFORMANCE_PLAN.md` §5.2. No CDN image pipeline is involved.

## Reusable patterns already proven elsewhere in the codebase

*Written before the build. All three were followed — kept as the record of what the plan assumed.*

- **Private storage + short-lived signed URLs**: `src/lib/supabase/wioa-storage.ts` already does
  this for WIOA documents (private bucket, magic-byte file-type validation independent of the
  declared MIME type, `createSignedUrl()` with a 5-minute expiry). Real Evidence File Storage can
  follow the same shape, extended for video.
- **Content-block editing pattern** (course builder's lessons): the client doc explicitly says
  Criteria Authoring Interface should follow this existing pattern rather than invent a new one.
- **"Latest attempt computed at query time, not overwritten"**: `QuizAttempt` and the existing
  `EvidenceSubmission` both already do this (`order by submittedAt desc, take 1`) — Attempt
  History extends the same approach to the per-criterion level.

## Regressions found by feature #12

The QA pass that closed this phase found four real regressions, all caused by features #7–#11's
new per-criterion shape coexisting with evidence submitted before it existed. Recorded here
because they are the phase's main lesson, not just a changelog entry: **the legacy shape did not go
away when the new one arrived, and four separate consumers silently assumed it had.**

1. Legacy evidence became invisible to the learner — `EvidenceView` decided "guided" from the
   *course* having criteria rather than the *submission* having `CriterionAssessment` rows.
2. The Portfolio rendered blank cards for guided submissions, whose `description` is empty by
   design — `src/lib/data/credentials.ts` was never updated.
3. Admin's learner detail 500'd on "View attachment" for a guided submission — `hasFile` was
   widened to include per-criterion captures, but the button calls `getEvidenceFileUrl`, which can
   only serve the course-level file.
4. The Reviewer Queue's bulk approve threw the whole page into the global error boundary —
   feature #7's gating throws, feature #6's bulk approve had no error handling, and one gated row
   aborted the loop *after* committing the rows before it.

Covered going forward by `tests/unit/legacy-evidence-regression.test.ts`. Full detail, including
what was verified *unaffected*, is in the kickoff doc's feature #12 row.
