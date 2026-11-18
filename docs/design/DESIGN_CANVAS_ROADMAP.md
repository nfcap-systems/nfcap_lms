# Design Canvas — Roadmap

Plan for building one **Design (canvas) artifact** holding the whole NFCAP LMS picture: the
references we studied, the foundations, every screen for all four roles, and the journeys that
connect them.

Written to be handed to whoever executes it. Nothing here is built yet — **no canvas exists**.

## Read these first

| File | Why |
| --- | --- |
| `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` | **The build plan.** 65 features, 9 phases, the 10 journey steps, the 13 modules. Scope authority. |
| `docs/client/NFCAP_LMS_Feature_Detail_Client.md` | Per-feature detail behind that plan. |
| `docs/design/LEARNER_UI_REFERENCES.md` | Which product each screen is modelled on, the brand direction, the capture tooling decision, what was rejected and why. |
| `docs/build/ADMIN_UI_REVAMP_BACKLOG.md` | Admin punch list, 8 open items, 2 of them real rendering bugs. |
| `docs/build/UI_REVAMP_SESSION_LOG.md` | Running state log. **Partly stale** — see Housekeeping below. |
| `docs/design/NFCAP_DESIGN_SYSTEM.md` | **Superseded for colour and type.** Keep for its WCAG contrast computations only. |
| `docs/wioa/WIOA_INTEGRATION_PLAN.md` | Funding module shape, for the `staff` and funding boards. |

**Authority split:** the **canvas owns visual truth** (what a screen looks like); the **build plan
owns scope and behaviour truth** (what exists, in which phase, how it behaves). On disagreement the
build plan wins and the board is corrected. This rule exists because the reference canvas already
drifted — four of its boards are titled "old draft, superseded by `docs/…`" because nobody set it.

## The structural reference

`claude.ai/artifact/MXPrcJmXhUkaahtZSwmXbk` ("ZONE Dining Benchmark") — a Design canvas of 127
artboards across 162 files: one `project/canvas.json` index plus one self-contained `.dc.html` per
artboard.

Six things it does that we copy:

1. **Benchmark pages first, own design last.** Its pages run competitor A (8 boards) → competitor B
   (10) → own-product decisions (4) → the design itself (105).
2. **Numbered bands as section titles** — `title1` notes at `x: 0` with increasing `y`: `0 · Map`,
   `1 · Foundations and components`, … `10 · User journeys, screen to screen`.
3. **Strict naming** — `ZD-<AREA><nn><variant>-<Name>.dc.html`, e.g. `ZD-D01b-DiscoverScrolled`.
4. **One shared stylesheet** — `project/zone-app.css` (43KB) linked relatively from every artboard.
   This is what makes 105 boards read as one product. It cannot be retrofitted.
5. **Real screenshots embedded as uploaded assets** — benchmark boards are grids of
   `<img src="/_blob/<id>">` with id + title + one-line note per capture, not recreations.
6. **Observation boards that say they are observations** — its tokens board states on the board:
   "Colours are pixel samples from the screenshots, so close but not exact."

Four things we change:

- **Web app, not phone.** Its screens are fixed 430×1120. Ours are PAGEs: `expand: "fill"`, fluid,
  1440, with phone-width variants only where it matters (evidence capture, player).
- **Four roles**, not one: Trainee, Admin, WIOA Coordinator, Partner Staff.
- **States carry the product.** Gating (OPEN / RESTRICTED), per-criterion Met / Not Met, and the
  funding milestone chain get their own boards.
- **Landscape captures tile differently.** Portrait phone shots sit six across a 1700px board; a
  readable 1440×900 capture is ~460×290, so three across.

## Canvas structure

**Title:** `NFCAP LMS Design` · **Board prefix:** `NF-` · **Pages (tabs):** six.

| Page id | Name | Boards | Content |
| --- | --- | --: | --- |
| `refs` | References | 9 | What we captured from each reference, plus observations and takeaways |
| `fnd` | Foundations | 14 | The design system as drawn: colour, type, components, every state |
| `trainee` | Trainee | 24 | The trainee-facing app |
| `admin` | Admin | 16 | The admin app |
| `staff` | Funding staff | 12 | WIOA Coordinator and Partner Staff |
| `journeys` | Journeys | 12 | The build plan's 10 steps plus the two review loops |

87 boards. The reference has 127, so the same order of magnitude.

`launch`: `{"view": "canvas", "page": "fnd"}` until the `trainee` page exists, then `trainee`.

### `refs` — References

| Board | Content |
| --- | --- |
| `NF-R01-Coursera-Screens` | The 8 Coursera captures (My Learning, course home, player, player at phone width, quiz pre-attempt, quiz question, graded result, Accomplishments) |
| `NF-R02-Coursera-Observed` | What we take, what we drop, sampled colour/type observations |
| `NF-R03-Udemy-Sidebar` | The 5 Udemy sidebar captures, annotated |
| `NF-R04-Codecademy-Gating` | Locked / current / completed steps; what a locked step says when clicked |
| `NF-R05-GOVUK-Patterns` | One-thing-per-page, task list, check-your-answers, error summary |
| `NF-R06-OneFile-EvidenceModel` | Upload → map to competency → submit → assessor review; mapped vs. storage-only |
| `NF-R07-Moodle-Gating` | Restrict access + activity completion; the student-side locked state |
| `NF-R08-StudioAdmin-Template` | `studio-admin.arhamkhnz.com`: shell, sidebar, and the `/dashboard/default` structure |
| `NF-R09-Takeaways` | What each reference contributed; what was rejected and why |

### `fnd` — Foundations

Where the new palette is actually settled, against the captures. 1440 wide.

`F01-Colour` (ink, accent, status triad — print the contrast ratios on the board) ·
`F02-Type` (Geist scale, 17px body) · `F03-SpaceShapeMotion` · `F04-Buttons` ·
`F05-Inputs` (including GOV.UK-style error summary and inline errors) ·
`F06-CardsCourse` (**the four states**: active, available, locked, completed) ·
`F07-StatusBadges` (**evidence states** In review / Met / Not Met / Needs changes, and the funding
milestones) · `F08-Tables` · `F09-DialogsDrawers` · `F10-EmptyErrorLoading` · `F11-Icons` ·
`F12-Accessibility` (focus ring, keyboard order, contrast proof) ·
`F13-Shells` (trainee header vs. admin sidebar) ·
`F14-Density` (staff dense, trainee airy — one token set, two densities; **depends on open
question 3**)

### `trainee` — Trainee

Bands: `0 · Map` · `1 · Home and pathway` · `2 · Player and quiz` · `3 · Evidence` ·
`4 · Certificates` · `5 · Funding` · `6 · Account and sign-up`.

`T00-SiteMap` · `T01-Home` · `T02-Pathway` · `T02b-PathwayLocked` · `T03-CourseOverview` ·
`T04-Player` · `T04b-PlayerPhone` · `T05-QuizPre` · `T05b-QuizQuestion` · `T05c-QuizResult` ·
`T06-EvidenceCriteriaList` · `T06b-EvidenceCapture` · `T06c-EvidenceCapturePhone` ·
`T06d-EvidenceNotMet` · `T06e-EvidenceResubmit` · `T06f-AttemptHistory` · `T07-Portfolio` ·
`T08-Certificates` · `T09-PublicVerify` · `T10-FundingStatus` · `T10b-EligibilitySelfCheck` ·
`T10c-DocumentChecklist` · `T11-Account` · `T12-SignUp`

### `admin` — Admin

Drawn from the template plus the backlog items. **`A01-Dashboard` draws the decided
`/dashboard/default` structure — `MetricCards`, `PerformanceOverview`, `SubscriberOverview` — not
the dashboard currently in the codebase.** The current academy-shaped `DashboardView.tsx` is being
replaced entirely, which also deletes backlog items 6 and 7 (the blocky Evidence Status chart and
the broken avatar stack) rather than fixing them.

`A00-Shell` (sidebar with section grouping, Quick Create as a real CTA pill, template-style header
icon buttons — backlog items 1–4) · `A01-Dashboard` · `A02-Learners` · `A03-LearnerDetail` ·
`A04-Courses` · `A05-CurriculumBuilder` · `A06-CriteriaAuthoring` · `A07-ReviewQueue` ·
`A08-PerCriterionReview` · `A09-PhotoAnnotation` · `A10-Pathway` · `A11-Cohorts` ·
`A12-Reporting` · `A13-Audit` · `A14-Roles` · `A15-Settings`

### `staff` — Funding staff

`W01-CaseList` · `W02-CaseDetail` · `W03-DocumentReview` · `W04-StatusRecording` ·
`W05-StalledCases` · `W06-ImpactReporting` · `W07-Boards` · `W08-BoardDetail` ·
`W09-DocumentRequirements` · `W10-EmailTemplate` ·
`W11-PartnerRoster` (restricted — no funding amounts) · `W12-PartnerLearnerDetail`

### `journeys` — Journeys

Wide strips, screen to screen. `J01`–`J10` map **exactly** onto the build plan's ten steps (sign up
→ match board → outreach and documents → eligibility review → funding approved → enrolled → lessons
and quiz → practical evidence → admin review → certificate), plus `J11-EvidenceLoop` (capture →
review → re-shoot only the failures) and `J12-ReviewLoop` (the reviewer's side).

## Frame sizes and layout

| Kind | Frame | Options |
| --- | --- | --- |
| PAGE (web screen) | `w: 1440`, `h` = its height at that width | `expand: "fill"` |
| Phone variant | `430 × 1120` | `is_interactive: true` |
| Foundations | `1440 × ~1400` | |
| Reference captures | `1700 × ~1650` | |
| Journey strip | `~1324 × 700` | `is_interactive: true` |

80px between frames in a row, 120px between rows. Band titles are `title1` notes at `x: 0`, at
least 223px above their row, `maxW` set to the row width. No frame may overlap another on the same
page.

## Build order

1. **`project/nfcap-app.css`** — the shared stylesheet. Not a board, but first: everything inherits
   from it and it cannot be retrofitted across 87 boards.
2. **`refs`** — gated on the capture run. Do it early; the palette decision in step 3 should be made
   with the captures on screen.
3. **`fnd`** — the palette and component states get settled here, visibly, on boards.
4. **`trainee`** — the current revamp scope.
5. **`journeys` J06–J10** — validate the trainee screens against the build plan's own steps. Gaps
   found here are cheap; gaps found in code are not.
6. **`admin`**, then **`staff`**, then **`journeys` J01–J05**.

Multiple sessions: foundations ≈ one, trainee two to three, admin two. Artboards are written and
published **one at a time** — the artifact type forbids two writes in a row.

## Pipeline: screenshots into the canvas

Two halves joined by a file path on disk. Either half can be swapped for manual work; a screenshot
taken by hand enters at step 2 and the result is identical.

1. **Capture** — gstack `browse`: `$B screenshot <path>`, or `$B responsive <prefix>` for
   375 / 768 / 1440 in one command. Output lands in `.gstack/browse-reports/<stamp>/screenshots/`.
   JPEG quality 60. Tooling decision, Claude-in-Chrome fallback trigger and the ToS note are in
   `LEARNER_UI_REFERENCES.md` → *Capture tooling*.
2. **Upload** — one Artifact publish per batch, `asset: true` with `file_paths`, **max 25 files per
   call**; each returns a `/_blob/<id>`.
3. **Place** — that `/_blob/<id>` goes verbatim into `<img src>` in the board's `.dc.html`, in a grid
   with id + title + one-line note per capture. Never a `data:` URI, never a local filename.
4. **Publish** the board; send the index only when the layout changes.

Limits: 25 assets per call, 15MB per binary file, 16MB per call, 512 files and 256MB per canvas. At
JPEG q60 none of these bite.

## Open questions

### Blocks work now — answer these three first

| # | Question | Blocks | Who |
| --: | --- | --- | --- |
| 1 | **How are open courses discovered?** The build plan's step 6 has a non-WIOA path ("signs up and enrols directly"), so some course-listing surface may be needed. Do **not** delete `src/app/learner/explore/` until this is answered. | `T01`, `T02`, `T12` | NFCAP / product |
| 2 | **Do Home and My Learning stay separate screens?** For a single assigned pathway, Home risks being a thin wrapper over the pathway list. | `T01`, `T02` | Us |
| 3 | **Does the new palette propagate into admin?** Admin is on a corporate shadcn template; trainee is getting ink + one accent. One foundations page or two. **Recommendation: propagate** — one token set, two densities. | `fnd` page shape, all `A*` and `W*` | Us |

### Blocks specific boards, due with its phase

| # | Question | Blocks | Who |
| --: | --- | --- | --- |
| 4 | **Pathway count** — more than one training pathway? Build plan decision, needed before Phase 1; gates the Multi-Pathway add-on. | `T02`, `A10` | NFCAP |
| 5 | **Photo or video evidence?** Build plan puts the media-delivery decision inside Phase 3 (Cloudflare Stream vs. Mux, adaptive HLS either way). Video changes capture and review. | `T06*`, `A08`, `A09` | NFCAP + us |
| 6 | **Credential expiry and portfolio sharing** — Phase 4. Expiry adds renewal states; sharing adds a public surface. | `T07`, `T08`, `T09` | NFCAP |
| 7 | **Cohort intake model** — Phase 6. | `A11` | NFCAP |
| 8 | **Social Security proof** — the board checklist requires proof of an SSN while the No-SSN rule forbids storing one; three options are in the build plan. Whatever is chosen shows on the checklist board. | `T10c`, `W03`, `W09` | NFCAP, before Phase 1 |
| 9 | **Is Portfolio grouped by course or by date?** Depends on the reviewer-queue shape, so it can wait until `A07` is drawn. | `T07` | Us, after `A07` |
| 10 | **Logo colours** — dropping the client's logo palette from their own product is their call. | `fnd` | NFCAP |

### Settled — do not reopen

- **Authority:** build plan for scope and behaviour, canvas for visual.
- **Brand:** navy/red dropped; ink + one accent + reserved status triad; Geist kept; dark mode out.
- **Capture tooling:** gstack `browse`, Claude-in-Chrome as the named fallback. REA rejected
  (reverse-engineering tool; conflicts with the no-copying rule).
- **Admin reference:** `studio-admin.arhamkhnz.com`, already built against.
- **Admin dashboard:** full swap to the template's `/dashboard/default` structure. The current
  academy-shaped dashboard is not being kept.
- **References:** 4 visual + 6 structural, listed in `LEARNER_UI_REFERENCES.md`, with 11 rejected
  candidates recorded there with reasons.

### Housekeeping — these files now contradict the above

- `docs/design/NFCAP_DESIGN_SYSTEM.md` still says **"Status: decided and implemented."** It is
  superseded for colour and type. Not yet edited.
- `docs/build/UI_REVAMP_SESSION_LOG.md` still records Coursera-primary / Udemy-sidebar-only and
  lists the locked-brand question as unresolved. Both out of date.

## Next step

1. Run the capture — the six no-login references plus the admin template need nothing from anyone.
2. Answer open questions 1–3.
3. Create the canvas: `project/nfcap-app.css`, then the `fnd` page.

Recommended order: 1, then 2 and 3 together (the palette wants the captures on screen).
