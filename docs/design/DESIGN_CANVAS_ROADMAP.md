# Design Canvas — Roadmap

How we build the NFCAP mockup canvas: the references we studied, the foundations, every screen for
all four roles, and the journeys that connect them.

**This file is the method. `docs/DEV-APPROACH.md` is the process and it outranks this file.**
Conformed to it on 2026-11-18. Where they still disagree, DEV-APPROACH wins and this file is
corrected.

Nothing is built yet — **no canvas exists**.

## Read these first

| File | Why |
| --- | --- |
| `docs/DEV-APPROACH.md` | **How we work.** Roles, the four gates, canvas ownership, naming, approval, Plane. Outranks this file. |
| `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` | **The build plan.** 65 features, 9 phases, the 10-step journey, 13 modules. What we build. |
| `docs/client/NFCAP_LMS_Feature_Detail_Client.md` | Per-feature detail behind that plan. |
| `docs/design/LEARNER_UI_REFERENCES.md` | What each screen is modelled on, the brand direction, the capture tooling decision, what was rejected. |
| `docs/SITEMAP.md` | Authoritative map: route → screen → board → ticket → phase → roles. Gate NFCAP-3. |
| `docs/MOCKUP-INDEX.md` | Every board with phase, status and approval. Canvas URL and owner at the top. |
| `docs/build/ADMIN_UI_REVAMP_BACKLOG.md` | Admin punch list, 8 open items, 2 of them real rendering bugs. |
| `docs/design/NFCAP_DESIGN_SYSTEM.md` | **Dropped.** Kept only for its WCAG contrast computations, the focus-ring technique and the four card states. Not a source for colour, type or spacing. |
| `docs/wioa/WIOA_INTEGRATION_PLAN.md` | Funding module shape, for the CRD / WIOA / PTN boards. |

**Authority order (from DEV-APPROACH):**
`ticket acceptance criteria > board > SITEMAP > build plan`.

A board therefore outranks the build plan at QC time, which is why **every board must be checked
against the build plan before it is approved, not after**. A board that promises something the plan
does not scope is a Plane ticket for Manjila, not a silent addition.

## Brand: settled 2026-11-18

**`docs/design/NFCAP_DESIGN_SYSTEM.md` is dropped**, along with `NFCAP_DESIGN_TOKENS.md`. Both are
STALE. Decided by Manjila in session on 2026-11-18 and amended into `docs/DEV-APPROACH.md` gate
NFCAP-4, which previously named the design system as the source.

**The design direction is created new, in the canvas.** The `FND` section *is* the design direction;
once approved, its tokens in `project/nfcap.css` are the source of truth for every board and for the
code that follows. No markdown file holds the palette any more.

The starting brief for `FND` is `LEARNER_UI_REFERENCES.md` → *Brand status*: graphite ink for
structure, one mid-tone accent for action at ~5%, a reserved status triad (green complete / amber
pending / red problem), Geist kept, body at 17px, dark mode out. The accent cannot be red, green or
amber because status owns those.

Three things are carried over from the dropped design system, because they are not brand opinions —
they go into `FND01-Tokens`, `FND12-Accessibility` and `FND06-CourseCards` respectively:

1. Its **WCAG contrast computations** — the only ones that exist for this codebase. Any new palette
   fails in the same two places: locked-state text, and small-bold text on a tint.
2. The **dual-tone focus ring** technique — visible on both light cards and dark bands without
   per-surface conditional styling.
3. The **four course-card states** as a taxonomy: active, available, locked, completed.

`NFCAP_DESIGN_SYSTEM.md` stays on disk as the record of those three things and nothing else. It is
not a source for colour, type or spacing.

## The gates (DEV-APPROACH order)

Each is approved before the next starts; approvals recorded on the Plane gate ticket.

| Gate | Ticket | Deliverable |
| --- | --- | --- |
| 1 | NFCAP-3 | **Sitemap** — `docs/SITEMAP.md` + boards `SITE01`–`SITE05` |
| 2 | NFCAP-4 | **Design direction** — `project/nfcap.css` + the `FND` boards |
| 3 | NFCAP-5 | **User journeys** — one per role plus the WIOA flow (`JRN` boards) |
| 4 | NFCAP-6 | **All mockups** — one board per screen, including phone, empty, error and permission states |
| 5 | per ticket | **Build**, in plan-phase order. Builder builds; lead checks against the board. |

Phases 0 and 1 are already built, so their boards are marked `exists` or `extend` and **not redrawn
from scratch**.

## The structural reference

`claude.ai/artifact/MXPrcJmXhUkaahtZSwmXbk` ("ZONE Dining Benchmark") — a Design canvas of 127
artboards across 162 files: one `project/canvas.json` index plus one self-contained `.dc.html` per
artboard. Six things it does that we copy:

1. **Benchmark boards first, own design after.** Its pages run competitor A → competitor B → own
   decisions → the design itself.
2. **Numbered sections** as `title1` notes at `x: 0` with increasing `y`.
3. **Strict naming**, area prefix first.
4. **One shared stylesheet** linked from every artboard. This is what makes 100+ boards read as one
   product, and it cannot be retrofitted.
5. **Real screenshots embedded as uploaded assets** — grids of `<img src="/_blob/<id>">` with id +
   title + one-line note per capture, not recreations.
6. **Observation boards that say they are observations** — its tokens board states on the board:
   "Colours are pixel samples from the screenshots, so close but not exact."

Four things we change:

- **Web app, not phone.** Its screens are fixed 430×1120. Ours are PAGEs: `expand: "fill"`, fluid at
  1440, with phone variants where DEV-APPROACH requires them (every screen needs a phone state).
- **Four roles**, not one.
- **States carry the product.** Gating (OPEN / RESTRICTED), per-criterion Met / Not Met, and the
  funding milestone chain get their own boards.
- **Landscape captures tile differently.** Portrait phone shots sit six across a 1700px board; a
  readable 1440×900 capture is ~460×290, so three across.

## Canvas

**Title: `NFCAP Mockups`.** **Owner: Manjila, in her own claude.ai account**, shared with Sadin with
**edit** rights. The canvas URL and its owner go at the top of `docs/MOCKUP-INDEX.md` on day one.
The client sees work on a **screen share**, never a shared link.

Created with `action: "quickstart", intent: "design"` to find the Design type, then **one** publish
with `type_url`, `title: "NFCAP Mockups"`, `auto_open: "after_first_write"` and nothing else. Every
later call uses the returned `url`; `type_url` is never sent again. Where the type's own instructions
differ from this file, **the type wins**. Starting files: `project/canvas.json` and
`project/Main.dc.html`, then one board per file, written and sent **one at a time**.

**Tokens:** one shared `project/nfcap.css`, linked from every board with
`<link rel="stylesheet" href="nfcap.css">`.

**Shared parts** (app shell, trainee header, admin sidebar) are separate `.dc.html` files pulled in
with `<dc-import>`, and each also renders as its own board.

**Board names:** `<AREA><NN>-<PascalName>.dc.html`.
**Board titles end `Phase n · status`**, where status is `exists`, `extend` or `new`, compared
against the code on `stage`.

### Areas and board list — 92 boards

DEV-APPROACH's areas are SITE, FND, LRN, ADM, CRD, PTN, WIOA, RPT, SET. Two are added here as the
lead's prerogative and recorded in `MOCKUP-INDEX.md`: **REF** (reference captures — not product
screens) and **JRN** (screen-to-screen journey strips, distinct from the `SITE02` journey map).

**Section 0 · Maps — SITE, 5**
`SITE01-Sitemap` · `SITE02-Journeys` · `SITE03-RoleAccess` · `SITE04-SurfaceMap` ·
`SITE05-NavPerRole`

**Section 1 · Foundations — FND, 14.** *This section is the design direction (gate NFCAP-4).*
`FND01-Tokens` (ink, accent, status triad, contrast ratios printed on the board) ·
`FND02-Typography` (Geist scale, 17px body) · `FND03-SpaceShapeMotion` · `FND04-Buttons` ·
`FND05-FormControls` (GOV.UK-style error summary and inline errors) ·
`FND06-CourseCards` (**the four states**: active, available, locked, completed) ·
`FND07-StatusBadges` (**evidence states** In review / Met / Not Met / Needs changes, plus funding
milestones) · `FND08-Tables` · `FND09-DialogsDrawers` · `FND10-EmptyErrorLoading` · `FND11-Icons` ·
`FND12-Accessibility` (focus ring, keyboard order, contrast proof) ·
`FND13-Shells` (trainee header vs. admin sidebar — the `<dc-import>` sources) ·
`FND14-Density` (staff dense, trainee airy — one token set, two densities; **blocked on open
question 3**)

**Section 2 · References — REF, 9.** Captures, not design. Exempt from the variants gate.
`REF01-CourseraScreens` · `REF02-CourseraObserved` · `REF03-UdemySidebar` ·
`REF04-CodecademyGating` · `REF05-GovukPatterns` · `REF06-OneFileEvidenceModel` ·
`REF07-MoodleGating` · `REF08-StudioAdminTemplate` · `REF09-Takeaways`

**Section 3 · Trainee — LRN, 24**
`LRN01-Home` · `LRN02-Pathway` · `LRN02b-PathwayLocked` · `LRN03-CourseOverview` ·
`LRN04-Player` · `LRN04b-PlayerPhone` · `LRN05-QuizPre` · `LRN05b-QuizQuestion` ·
`LRN05c-QuizResult` · `LRN06-EvidenceCriteria` · `LRN06b-EvidenceCapture` ·
`LRN06c-EvidenceCapturePhone` · `LRN06d-EvidenceNotMet` · `LRN06e-EvidenceResubmit` ·
`LRN06f-AttemptHistory` · `LRN07-Portfolio` · `LRN08-Certificates` · `LRN09-PublicVerify` ·
`LRN10-FundingStatus` · `LRN10b-EligibilitySelfCheck` · `LRN10c-DocumentChecklist` ·
`LRN11-Account` · `LRN12-SignUp` · `LRN13-OpenCourseEnrol` (**blocked on open question 1**)

**Section 4 · Admin — ADM, 14**
`ADM01-Shell` (sidebar section grouping, Quick Create as a real CTA pill, template-style header icon
buttons — backlog items 1–4) · `ADM02-Dashboard` · `ADM03-Learners` · `ADM04-LearnerDetail` ·
`ADM05-Courses` · `ADM06-CurriculumBuilder` · `ADM07-CriteriaAuthoring` · `ADM08-ReviewQueue` ·
`ADM09-PerCriterionReview` · `ADM10-PhotoAnnotation` · `ADM11-Pathway` · `ADM12-Cohorts` ·
`ADM13-Audit` · `ADM14-Roles`

**`ADM02-Dashboard` draws the decided `/dashboard/default` structure** — `MetricCards`,
`PerformanceOverview`, `SubscriberOverview` — **not** the dashboard currently in the codebase. The
academy-shaped `DashboardView.tsx` is being replaced entirely, which deletes backlog items 6 and 7
(the blocky Evidence Status chart, the broken avatar stack) rather than fixing them.
`PerformanceOverview` needs new date-bucketed aggregation; nothing in `src/lib/data/progress.ts`
buckets activity by date.

**Section 5 · Coordinator — CRD, 5**
`CRD01-CaseList` · `CRD02-CaseDetail` · `CRD03-DocumentReview` · `CRD04-StatusRecording` ·
`CRD05-StalledCases`

**Section 6 · WIOA configuration — WIOA, 4**
`WIOA01-Boards` · `WIOA02-BoardDetail` · `WIOA03-DocumentRequirements` · `WIOA04-EmailTemplate`

**Section 7 · Partner staff — PTN, 2**
`PTN01-Roster` (restricted — no funding amounts) · `PTN02-LearnerDetail`

**Section 8 · Reports and settings — RPT 2, SET 1**
`RPT01-AdminReporting` · `RPT02-FundingImpact` · `SET01-AdminSettings`

**Section 9 · Journeys — JRN, 12.** Gate NFCAP-5.
`JRN01`–`JRN10` map **exactly** onto the build plan's ten steps (sign up → match board → outreach
and documents → eligibility review → funding approved → enrolled → lessons and quiz → practical
evidence → admin review → certificate), plus `JRN11-EvidenceLoop` (capture → review → re-shoot only
the failures) and `JRN12-ReviewLoop` (the reviewer's side).

## Frame sizes and layout

| Kind | Frame | Options |
| --- | --- | --- |
| PAGE (web screen) | `w: 1440`, `h` = its height at that width | `expand: "fill"` |
| Phone variant | `430 × 1120` | `is_interactive: true` |
| Foundations | `1440 × ~1400` | |
| Reference captures | `1700 × ~1650` | |
| Journey strip | `~1324 × 700` | `is_interactive: true` |

80px between frames in a row, 120px between rows. Section titles are `title1` notes at `x: 0`, at
least 223px above their row, `maxW` set to the row width. No frame may overlap another on its page.

## Approval, per board

1. A canvas comment **"Approved"** from Manjila, or from Sadin where he reviews.
2. Copied into the **Approved** column of `docs/MOCKUP-INDEX.md` with who and when.
3. Changing an approved board needs a **fresh** approval, recorded the same way.

Before approval, each board is checked against the build plan (authority order above) and against
the **100%-match rule**: layout, copy and states are binding; **mock data is not**. Compare real
screenshots with boards, never an agent's description of a board.

Every screen board must include its **phone, empty, error and permission** states — drawn up front,
not added later. This is where Zone POS lost the most rework.

## Pipeline: screenshots into the canvas

Two halves joined by a file path on disk. A screenshot taken by hand enters at step 2; the result is
identical.

1. **Capture** — gstack `browse`: `$B screenshot <path>`, or `$B responsive <prefix>` for
   375 / 768 / 1440 in one command. Write to the session scratchpad, not the repo. JPEG quality 60.
   Tooling decision, the Claude-in-Chrome fallback trigger and the ToS note are in
   `LEARNER_UI_REFERENCES.md` → *Capture tooling*.
2. **Upload** — one Artifact publish per batch, `asset: true` with `file_paths`, **max 25 files per
   call**; each returns a `/_blob/<id>`.
3. **Place** — that `/_blob/<id>` goes verbatim into `<img src>` in the board's `.dc.html`, in a grid
   with id + title + one-line note per capture. Never a `data:` URI, never a local filename.
4. **Publish** the board; send the index only when the layout changes.

Limits: 25 assets per call, 15MB per binary file, 16MB per call, 512 files and 256MB per canvas.

## Syncing boards back into the repo

Only once a QC harness exists (its own ticket): Artifact `read` on the canvas `url` with `paths` =
`canvas.json`, `nfcap.css`, the shared imports and the boards, `out_dir: qc/boards`; write the canvas
version to `qc/boards/VERSION`; keep `qc/boards/` git-ignored.

## Execution checklist

Run top to bottom. **After every task** report in this format, then continue — never batch several
tasks into one report:

```
DONE <task id> — <what was produced>
EVIDENCE — <file paths, board names, or URL>
NEXT — <task id and one line>
BLOCKED — <nothing, or the exact question needed>
```

### Hard stop rules

1. **⚑ NOTHING IS DRAWN INTO THE CANVAS UNTIL THE DESIGN IS APPROVED.** For every page, first
   produce **2–3 mockup variants as throwaway previews**, show them, wait. Only the chosen variant
   becomes a board. Variants live outside the canvas — local HTML in the scratchpad or a gstack
   comparison board — never as extra artboards. The REF section is exempt: captures, not design.
2. **⚑ STOP before creating or first writing to the canvas.** It is Manjila's artifact in her
   account; this session does not create it unprompted.
3. **⚑ STOP before locking the palette.** The accent is a one-way door for every board after it.
4. **⚑ STOP before any browser action that writes to a real account** — starting a quiz, marking a
   lesson complete, submitting a form. Screenshots are read-only; those are not.
5. **Never two file writes in a row** when building artboards — write one, publish it, then the next.
6. **Never verify unless asked** — do not read boards back, re-render or screenshot the canvas.
7. **One gate at a time.** Do not start a later gate because an earlier one is blocked. Report the
   block.
8. **Write every approved plan to `docs/plans/` or the ticket the moment it is approved.** Chat is
   not storage — Zone POS lost two approved plans to cleared context.
9. **Do not commit or push** unless asked. Do not hand-edit `tasks/TRACKER.md`. The repo is public
   today: do not commit the tracker until Sadin confirms it is private.

### Gate NFCAP-3 — Sitemap

| Task | Do | Needs user |
| --- | --- | --- |
| 3.1 | Enumerate every route under `src/app/` and cross-reference the build plan's 65 features. Produce `docs/SITEMAP.md`: route → screen → board → ticket → phase → roles, plus numbered journeys (J1…) and rules (R1…). | no |
| 3.2 | Audit each screen against the code on `stage`: mark `exists`, `extend` or `new`. Scaffold `docs/MOCKUP-INDEX.md` with the board list, phase and status; Approved column empty. | no |
| 3.3 | Report the board count. If it is materially above 92, say so — it bears on the end-of-December timeline flagged in DEV-APPROACH. | no |
| 3.4 | Boards `SITE01`–`SITE05`, once the canvas exists (rule 2). | **yes** |

### Capture run — feeds gate NFCAP-4, runs any time

| Task | Target | Shots |
| --- | --- | --: |
| C.0 | Build gstack's browser: `cd ~/.claude/skills/gstack/browse && ./setup` → `READY: <path>`. `bun` and `node` are installed. | — |
| C.1 | **Codecademy** — career-path syllabus with completed + current + locked steps in one frame; what a locked step says when clicked | 3 |
| C.2 | **Moodle** `demo.moodle.net` — set an access restriction as teacher, capture the **student-side** locked state; plus activity-completion settings | 4 |
| C.3 | **OneFile** — public provider guides (Lincoln, NHS NSHCS): the trainee upload/mapping flow **and** the assessor review flow | 6 |
| C.4 | **GOV.UK Design System** — one-thing-per-page, task list, check-your-answers, error summary | 4 |
| C.5 | **Credly** — a public badge verification page, as an anonymous visitor | 2 |
| C.6 | **Canvas** — rubric, submission and quiz-settings documentation | 3 |
| C.7 | **`studio-admin.arhamkhnz.com`** — sidebar/shell, `/dashboard/default` (all three components), one data-table page. Responsive. | 6 |
| C.8 | **Coursera and Udemy**, 13 shots — needs a signed-in session: `$B connect`, then the user signs in (`$B handoff` → sign in → `$B resume`). **⚑ Stop before any quiz attempt.** If the sites block the automated Chromium, stop and switch to the Claude-in-Chrome fallback or manual capture; do not retry repeatedly. | 13 |

Report the file list with each image shown inline before anything is uploaded. Then upload and build
the REF boards (pipeline above).

### Gate NFCAP-4 — Design direction

| Task | Do | Needs user |
| --- | --- | --- |
| 4.1 | Run **`/design-consultation`** against *Brand status* in `LEARNER_UI_REFERENCES.md` and the REF boards. The old design system is dropped — do not read tokens from it (see **Brand: settled** above). | no |
| 4.2 | **⚑ STOP.** Show **2–3 palette/type variants** as previews, not boards. Wait for the pick. | **yes** |
| 4.3 | Write `project/nfcap.css` from the approved variant. | no |
| 4.4 | **⚑ STOP.** Draw 2–3 variants of **one** representative sheet (`FND06-CourseCards`, the four states). It sets the house style for the other 13. | **yes** |
| 4.5 | `FND01` … `FND14`, one board per publish. Two token sets (Learner/Coursera-leaning, Admin+Coordinator+Partner/studio-admin-leaning), one shared status triad — see "Settled," palette does not propagate. | no |
| 4.6 | Run **`/design-review`** over the finished section and fix what it finds. Record approvals in MOCKUP-INDEX. | no |

### Gate NFCAP-5 — Journeys

| Task | Do | Needs user |
| --- | --- | --- |
| 5.1 | `JRN01`–`JRN12`, one board per publish, from the build plan's ten steps plus the two loops. One journey per role is the DEV-APPROACH requirement; the ten steps satisfy the trainee and funding paths. | no |
| 5.2 | Reconcile against `SITE02-Journeys` and `docs/SITEMAP.md`'s numbered journeys. Any screen a journey needs that the sitemap lacks is a gap — raise it, don't invent it. | no |

### Gate NFCAP-6 — All mockups

Per section, in this order: **LRN → ADM → CRD + WIOA + PTN → RPT + SET**. Each section runs the
design loop below. Boards marked `exists` or `extend` are not redrawn from scratch.

| Step | Do | Tool | Needs user |
| --: | --- | --- | --- |
| 1 | Write the per-board briefs for the section — two or three lines each: what the screen shows, which reference it draws on, which states appear. The board names above are a list, not a spec. | — | no |
| 2 | Pick the 2–3 **anchor screens** (for LRN: `LRN01-Home`, `LRN04-Player`, `LRN06b-EvidenceCapture`) and produce **2–3 variants of each** as throwaway previews. | **`/design-shotgun`** | no |
| 3 | **⚑ STOP.** Show the variants. Wait for the pick, including mixing ("variant 2's header with variant 1's card"). | — | **yes** |
| 4 | Draw the section's boards in the approved style, one board per publish, each with its phone, empty, error and permission states. | **`/design-html`** | no |
| 5 | Review, fix, then record each approval in `MOCKUP-INDEX.md`. | **`/design-review`** | partly |

gstack design skills and what each is for: **`/design-consultation`** (propose a system, font and
colour previews — gate NFCAP-4) · **`/design-shotgun`** (variants, comparison board, structured
feedback — step 2) · **`/design-html`** (production-quality HTML/CSS — step 4) ·
**`/design-review`** (visual QA: spacing, hierarchy, inconsistency, AI-slop patterns — step 5) ·
**`/ui-ux-pro-max`** and **`/impeccable`** (pattern and palette reference for a specific question).

## Open questions

### Blocks work now

| # | Question | Blocks | Who |
| --: | --- | --- | --- |
| 1 | **How are open courses discovered?** The build plan's step 6 has a non-WIOA path ("signs up and enrols directly"), so a course-listing surface may be needed. Do **not** delete `src/app/learner/explore/` until answered. | `LRN01`, `LRN02`, `LRN13` | NFCAP |
| 2 | **Do Home and My Learning stay separate screens?** For a single assigned pathway, Home risks being a thin wrapper over the pathway list. | `LRN01`, `LRN02` | Us |

### Blocks specific boards, due with its phase

| # | Question | Blocks | Who |
| --: | --- | --- | --- |
| 4 | **Pathway count** — more than one training pathway? Needed before Phase 1; gates the Multi-Pathway add-on. | `LRN02`, `ADM11` | NFCAP |
| 5 | **Photo or video evidence?** Phase 3 media decision (Cloudflare Stream vs. Mux, adaptive HLS either way). Video changes capture and review. | `LRN06*`, `ADM09`, `ADM10` | NFCAP |
| 6 | **Credential expiry and portfolio sharing** — Phase 4. | `LRN07`, `LRN08`, `LRN09` | NFCAP |
| 7 | **Cohort intake model** — Phase 6. | `ADM12` | NFCAP |
| 8 | **Social Security proof** — the checklist requires proof of an SSN while the No-SSN rule forbids storing one. | `LRN10c`, `CRD03`, `WIOA03` | NFCAP, before Phase 1 |
| 9 | **Portfolio grouped by course or by date?** Depends on the reviewer-queue shape. | `LRN07` | Us, after `ADM08` |
| 10 | **Logo colours** — dropping the client's logo palette from their own product is their call. | `FND01` | NFCAP |

### Settled — do not reopen

- **Process:** DEV-APPROACH v1.0 (OPS-177). Two sessions, four gates, Manjila owns the canvas.
- **Authority:** ticket AC > board > SITEMAP > build plan.
- **Capture tooling:** gstack `browse`, Claude-in-Chrome as the named fallback. REA rejected
  (reverse-engineering tool; conflicts with the no-copying rule).
- **Admin reference:** `studio-admin.arhamkhnz.com`, already built against.
- **Admin dashboard:** full swap to the template's `/dashboard/default` structure.
- **References:** 4 visual + 6 structural + the admin template, in `LEARNER_UI_REFERENCES.md`, with
  11 rejected candidates recorded there with reasons.
- **Palette does NOT propagate to admin (decided 2026-11-19, user, in session — reverses the
  provisional "propagate" recommendation that stood here before):** two visual identities, not one
  shared palette with just two densities. Learner matches Coursera — white/light background, one
  hue accent, locked 2026-11-19 (user), gate 4.2: `#2563EB` ("Institutional Blue"), matching
  Coursera's own confirmed accent. Admin, Coordinator and Partner match
  `studio-admin.arhamkhnz.com`'s own identity, confirmed near-monochrome in its real captures
  (`REF08-StudioAdminTemplate`) — graphite/black carries the "action" weight there, no hue accent.
  **The status triad (green/amber/red) stays shared across every role** — a "Problem" flag must
  mean the same thing everywhere. Density (`FND14-Density`) now follows naturally from each
  system's own reference (Coursera airier, the admin template denser) rather than being a separate
  open question — `FND14-Density` is no longer blocked.
- **State frames (decided 2026-11-18, user, in session):** one board per screen, with its desktop,
  phone, empty, error and permission states as **frames on that same board** — not separate
  artboards. A separate phone board is kept only where the phone layout is a genuinely different
  design (`LRN04b`, `LRN06c`, and `LRN06b` if it proves so). This keeps the board count at 92–109,
  not ~150. Boards map 1:1 to `docs/SITEMAP.md` rows.

## Effort and timeline

Roughly eight to nine sessions for 92 boards. DEV-APPROACH's schedule: week of 18 Nov sitemap then
design direction; week of 23 Nov journeys and first mockups.

⚠️ DEV-APPROACH already flags that the build plan's ~1,431 hours (~18 weeks, two engineers) does not
fit the end-of-December delivery date, and that Manjila and Sadin must confirm what actually ships.
Task 3.3's board count is the first hard number that bears on it.
