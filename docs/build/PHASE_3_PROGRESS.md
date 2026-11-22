# Phase 3 Progress

Working log of Phase 3 execution against
`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` ("Phase 3 — Evidence & Competency ★",
12 features, 260h). Mirrors `docs/build/PHASE_0_PROGRESS.md`/`PHASE_1_PROGRESS.md`/
`PHASE_2_PROGRESS.md`'s convention — update this as status changes.

## Status as of 2026-11-18

**Phase 3 has not started.** Scope was discussed and planned in detail (see below) but no code has
been written yet.

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

- [ ] A trainee uploads real photos against each named criterion and cannot submit until all
      required items are captured
- [ ] A reviewer assesses every criterion Met / Not Met with notes pinned on the photo
- [ ] ★ A certificate cannot be issued unless every required criterion is Met
- [ ] A rejected trainee sees exactly what failed and re-shoots only that

## Dependencies / open decisions before (or early in) this phase

1. **NFCAP's trade experts must author the assessment criteria.** The feature is only as credible
   as the criteria — this cannot be substituted with engineering assumptions. Blocks Criteria
   Authoring Support and, practically, blocks Guided Evidence Capture / Reviewer Queue / Per-
   Criterion Review from being usable with real content (though they can be built and tested
   against placeholder criteria in the meantime).
2. **Media delivery architecture** — the client doc calls this out as belonging in *this* phase,
   not deferred to launch, because storage architecture is expensive to change once later features
   depend on it. Options named in the doc: Cloudflare Stream (flat per-minute, no egress fees) or
   Mux (per-minute, free monthly allowance, stronger analytics), adaptive HLS either way. Not yet
   decided.
3. **Image optimization is a self-hosting cost, not a managed-platform one.** Per
   `docs/build/PERFORMANCE_PLAN.md` §5.2, resizing needs to happen at upload time and/or be served
   from a CDN — not computed per request, since that CPU cost runs on our own server.

## Reusable patterns already proven elsewhere in the codebase

- **Private storage + short-lived signed URLs**: `src/lib/supabase/wioa-storage.ts` already does
  this for WIOA documents (private bucket, magic-byte file-type validation independent of the
  declared MIME type, `createSignedUrl()` with a 5-minute expiry). Real Evidence File Storage can
  follow the same shape, extended for video.
- **Content-block editing pattern** (course builder's lessons): the client doc explicitly says
  Criteria Authoring Interface should follow this existing pattern rather than invent a new one.
- **"Latest attempt computed at query time, not overwritten"**: `QuizAttempt` and the existing
  `EvidenceSubmission` both already do this (`order by submittedAt desc, take 1`) — Attempt
  History extends the same approach to the per-criterion level.

## Not started

All 12 features.
