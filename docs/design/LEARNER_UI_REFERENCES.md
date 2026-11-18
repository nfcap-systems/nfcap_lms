# Learner UI — Reference Plan

Decided 2026-11-18. The visual and UX references for the learner-facing (trainee) UI revamp:
which product each screen is modelled on, what to collect from each, and what was rejected.

This is a **reference and research plan**, not a design spec and not an implementation plan.
It says where the patterns come from. It does not say what to build — that is the build plan's
job (see Authority below).

Scope: the **trainee** role in full detail (the revamp in progress), plus the **admin and staff**
reference, which was already chosen and built against — see *Admin and staff references* below.
Admin punch-list items stay in `docs/build/ADMIN_UI_REVAMP_BACKLOG.md`; this doc only records what
admin is modelled on.

The canvas that renders all of this is planned in `docs/design/DESIGN_CANVAS_ROADMAP.md`.

## Authority

In this order. References answer only what the docs above them do not cover.

1. `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` — **the build plan.** What is in
   scope, in which phase, at what cost.
2. `docs/client/NFCAP_LMS_Feature_Detail_Client.md` — per-feature detail behind that plan.
3. `docs/wioa/WIOA_INTEGRATION_PLAN.md`, `docs/build/WIOA_BUILD_WORKFLOW.md` — the funding module.
4. `docs/product/PRODUCT_CONTEXT.md` — product scope, roles, closed feature decisions.
5. This document.

If a reference does something differently from the docs above, the docs win. Use the references
to answer questions the docs are silent on, never to re-open ones they have closed.

## Brand status

The navy/red brand system in `docs/design/NFCAP_DESIGN_SYSTEM.md` is **dropped** for this revamp
(decided 2026-11-18). That file is superseded for its colour and type direction, but is **not to
be deleted** — it holds the only WCAG contrast computations that exist for this codebase.

Replacement direction (not yet locked — to be decided against the collected screenshots):

- **Graphite / near-black ink** for structure: headings, nav, hero. Not a coloured navy.
- **One mid-tone accent** for action only: primary buttons, current step, progress. Target ~5% of
  surface area.
- **A reserved status triad**: green = complete, amber = pending/waiting, red = problem. Never
  used decoratively.
- The accent therefore **cannot** be red, green or amber — status owns those. This rules out
  hi-vis amber and safety orange (collide with "pending") and teal (reads as "complete" at small
  sizes), which lands the accent in the blue/indigo family.
- **Keep Geist.** Raise body text to 17px for this audience. Dark mode stays out of scope.

Carried over from the dropped design system, because none of these are brand opinions:

1. The four card states as a taxonomy: active / available / locked / completed.
2. The dual-tone focus ring technique (visible on both light cards and dark bands without
   per-surface conditional styling).
3. The two contrast fixes — locked-state text, and small-bold text on a tint. Any new palette
   fails in exactly those two places.

Open: the NFCAP logo (`public/nfcap-logo.png`) still sits in the header, so the accent must not
clash with it. Dropping a client's logo colours is NFCAP's call, not a design decision — raise it
with them.

## Visual references — what it looks like

| Ref | Scope | Access |
| --- | --- | --- |
| **Coursera** | The base: Home/resume, course player, quiz, certificate, overall tone. Default for anything the others do not claim. | Needs our login |
| **Udemy** | Curriculum sidebar only — section accordion, per-item checkmarks, completed counts, durations. | Needs our login |
| **Frappe Learning** | Component patterns: lesson layout, quiz, list density. The most modern-looking open-source LMS, and self-hostable so real states can be seen rather than guessed. | Self-host, free |
| **Codecademy** | Locked / current / completed step treatment in a linear path. | Public, no login |
| **Figma** or **Markup.io** | Comment pins anchored to a point on an image — the only reference for Phase 3's *Photo Annotation* (20h). No LMS does this well. | Public |

## Structural references — how it behaves

| Ref | Scope | Access |
| --- | --- | --- |
| **GOV.UK Design System** | One-thing-per-page, task list, check-your-answers, error summary and error message patterns, accessibility. Built and user-tested for exactly this audience. | Public |
| **Moodle** | Gating. "Restrict access" + "activity completion" is the canonical OPEN/RESTRICTED model, including whether a locked item hides or shows greyed with its condition stated, and how learner-marked completion interacts with a gate. | Public docs + `demo.moodle.net` |
| **OneFile** | The evidence model: upload → map each item to the competencies it proves → submit → assessor reviews against those competencies. Plus the mapped-and-submitted vs. storage-only split. | Public provider guides |
| **Canvas** | Submission lifecycle: submit → rubric → feedback → targeted resubmission, and the naming of each state. Also quiz attempt rules. | Free account |
| **USCIS case status** / package tracker | Funding timeline: vertical steps, always naming **who holds the ball**, with the action in the current step when it is the trainee's. | Public |
| **Credly** | The public, no-login QR verification page (Phase 4). | Public |

## Admin and staff references

Admin was **not** designed from the references above. It was built on 2026-11-17 against a named
template and already exists in the codebase, so its reference is settled — it is recorded here only
so the whole product has one reference list.

| Ref | Scope | Access |
| --- | --- | --- |
| **`studio-admin.arhamkhnz.com`** | The admin shell, sidebar, header, dashboard, data tables and page chrome. A shadcn / `radix-nova` admin template. The entire admin surface was converted to it. | Public, no login — the cheapest capture of the whole set |

State of that work:

- **Built**, typechecking and linting clean: shell, Quick Create, dashboard, data tables, all admin
  pages.
- **8 open visual gaps** against the template — see `docs/build/ADMIN_UI_REVAMP_BACKLOG.md`. Two are
  real rendering defects, not polish: the Evidence Status chart bars (solid full-bleed blocks, no
  `barGap`, no `radius`, no legend) and the Performance Highlights avatar stack (initials merging
  into one pill; the per-student offset math ignores circle radius).
- **One decided but unbuilt change**: `/admin`'s dashboard gets a **full swap** to the template's
  `/dashboard/default` structure — `MetricCards`, `PerformanceOverview`, `SubscriberOverview`. The
  four KPIs stay the same, restyled. The `PerformanceOverview` equivalent needs **new
  date-bucketed aggregation**; nothing in `src/lib/data/progress.ts` buckets activity by date, so
  that is new work, not a restyle. Canvas boards for the admin dashboard must draw the **decided**
  structure, not the current build.

WIOA Coordinator and Partner Staff have **no separate reference** and need none: they are staff
tools on the same admin shell. Note that `WioaReportsView` and `AccountSettingsForm` are shared
across admin, coordinator, partner and learner and were deliberately left on the old design, with
only their page headers reskinned. They will be the visible seams in any canvas board that includes
them.

## Per-screen mapping

| Screen | Visual from | Structural from |
| --- | --- | --- |
| Home | Coursera | — (resume + next + blockers) |
| My Learning / pathway | Codecademy | Moodle |
| Course player | Coursera | Moodle |
| Curriculum sidebar | Udemy | Moodle |
| Quiz | Coursera | Canvas |
| Evidence capture | Frappe + GOV.UK | OneFile + Canvas |
| Evidence feedback / annotation | Figma pins | Canvas + OneFile |
| Certificates | Coursera | — |
| Public verification page | Credly | Credly |
| Funding / WIOA status | Coursera chrome + tracker timeline | Tracker + WIOA plan |
| Eligibility self-check | GOV.UK | GOV.UK |

## Capture list

### Needs our Coursera/Udemy login — 13 shots

Coursera (audit a free course if nothing is in progress):

1. My Learning, with an in-progress course visible
2. Course home / syllabus, before entering a lesson
3. Player mid-lesson, curriculum nav open
4. Player at phone width (nav collapsed)
5. Quiz pre-attempt screen — the one showing attempts allowed and pass threshold
6. Quiz mid-attempt, one question
7. Graded quiz result (pass or fail)
8. Accomplishments page

Udemy (any free course):

9. Player with sidebar expanded — a completed section, the current item and durations in one frame
10. A section header showing a partial completed count (e.g. 3/7)
11. Sidebar after finishing one item, so a checked and an unchecked item sit side by side
12. A practice quiz question
13. Player at phone width, sidebar collapsed, then opened

**Known hole, do not chase it:** the certificate-earned moment. Coursera audit tracks and free
Udemy courses do not issue certificates, so it cannot be triggered. Both publish help-centre
articles with certificate screenshots — take it from there.

### Needs no login

- **Codecademy** — a career-path syllabus scrolled so a completed, current and locked step are all
  visible in one frame; and what a locked step does when clicked (does it say *why* it is locked?).
- **Moodle** — `demo.moodle.net`: set an access restriction as the teacher, then view the locked
  activity from the student side. That student-side locked state is the screen we want.
- **OneFile** — the public training-provider guides and PDFs (Lincoln's resources hub, NHS NSHCS
  guidance): both the trainee-side upload/mapping flow and the assessor-side review flow.
- **GOV.UK Design System** — the one-thing-per-page, task list, check-your-answers, and error
  summary pattern pages.
- **Canvas** — rubric, submission and quiz-settings documentation; free teacher account if a live
  flow is wanted.
- **Credly** — a public badge verification page as an anonymous visitor.
- **Frappe Learning** — docs, or self-host and walk the trainee and author screens.

## Standing rules

1. **Authority order above.** References inform; the build plan decides.
2. **Say "trainee"**, not "learner", in all UI copy — the build plan's own vocabulary.
3. **Responsive web, not mobile-native.** The build plan is explicit that this is a web
   application; *Mobile Evidence Capture* is a 128h add-on. Design for the phone browser; do not
   assume a native camera or offline capture.
4. **GPL/AGPL** on Moodle, Canvas and Frappe. Patterns and layout ideas only — no code lifted into
   NFCAP. This is a client product.
5. **No gamification.** No streaks, XP, mascots, leaderboards or confetti. Trade apprentices work
   irregular jobsite schedules — a broken streak punishes someone for being on a job — and this is
   WIOA-funded training where the stakes are real money and employment. Keep only the single
   "this just unlocked" confirmation.
6. **No marketplace chrome.** Strip ratings, enrolment counts, related-courses rails, upsells, and
   instructor-bio-as-marketing from anything borrowed from Coursera or Udemy.
7. **Plain trade language, no internal jargon.** "Photos and documents", not "evidence artifacts".
   "Funding", not "WIOA case status". "What's next", not "competency attainment".
8. **Jobsite legibility.** 44px+ targets, no icon-only actions, body text never below 16px, no
   gradients or glass effects. Evidence gets captured on a phone, outdoors, with dirty hands.

## Rejected, with reasons on record

| Rejected | Why |
| --- | --- |
| Craft Connect, BuildWithin, Elevate317 | Feature claims come from vendor marketing pages; the product cannot be seen without a sales demo. Unverifiable. |
| Khan Academy | Was carried as a "tone" reference. Tone is not checkable in review, so it became the audience rules in Standing Rules 5–8 instead. |
| Interplay Learning | Audience is nearly identical (skilled trades), but the public material is shallow marketing walkthroughs, and its product is a catalog. The audience lesson is absorbed; the screenshots add nothing. |
| Totara | Searched specifically for native apprenticeship evidence sign-off and **could not confirm it exists**. Real and documented: compliance programs, recertification reminders, audit trails, manager approvals, competency-to-role mapping. Park it for recertification (Phase 4 expiry), not for learner UI. |
| TalentLMS, Docebo, Absorb, Litmos | Enterprise-bland and dense. Their one lesson — assigned, not browsed — is a sentence, not a screenshot set. |
| Open edX | Dated and heavy. |
| LearnDash, Tutor LMS | WordPress plugins; their UX is whatever theme is bolted on. |
| Thinkific, Teachable | Creator-economy shape: selling courses to strangers. Wrong model. |
| Expensify / Ramp | Was the evidence-gap reference. Cut once the build plan confirmed Phase 3 evidence is a **rubric** (per-criterion Met/Not Met, notes pinned on the photo, targeted resubmission), not a receipt. Canvas and OneFile cover it properly. |

## Open questions — resolve before designing Home

1. **How are open courses discovered?** The build plan's journey step 6 has a non-WIOA path
   ("a trainee on an open course signs up and enrols directly"), so some lightweight course-listing
   surface may genuinely be needed. `src/app/learner/explore/` should not be deleted until this is
   answered.
2. **Do Home and My Learning stay separate screens?** For a single assigned pathway, Home risks
   being a thin wrapper over the pathway list.
3. **Is Portfolio grouped by course or by date?** Depends on the shape of the Phase 3 reviewer
   queue — check that before deciding.
4. **Logo colours** — see Brand status above. NFCAP's call.
5. **Does the new palette propagate into admin?** Admin follows a clean corporate shadcn template;
   trainee is getting ink + a single accent. That is two visual languages in one product, and a
   canvas showing both side by side is where it becomes obvious. **Recommendation: propagate** —
   same tokens, different density (staff tools denser, trainee screens airier). Decide before the
   foundations page is built, because it determines whether there is one foundations page or two.

## Next step

Collect the screenshots. The six no-login references can be captured without anything from the
user; the 13 Coursera/Udemy shots need a logged-in session.

### Capture tooling — decided: gstack `browse`

**Decision (2026-11-18): use gstack's `browse` / `connect-chrome` skills.** Claude-in-Chrome is the
named fallback, not a parallel option — the two conflict by design (gstack's own install notes say
to use `/browse` instead of `mcp__claude-in-chrome__*`), so only one is in play at a time.

Why gstack over Claude-in-Chrome: already installed (`~/.claude/skills/`) with `bun` and `node`
both present; `$B responsive <prefix>` captures mobile 375 / tablet 768 / desktop 1440 in one
command, which is exactly the shape of the capture list above; its Chromium runs on a **separate
profile**, so a misclick cannot touch real browser state; and the same driver backs
`/design-review`, `/qa` and `/benchmark` against the NFCAP app itself, so the setup keeps paying
off after this job.

What it costs: a one-time `./setup` build (~10s). On Windows, `browse` falls back to gstack's own
Chromium (Aside is macOS-only) and `connect-chrome` launches it headed. Because the profile is
separate, **our real Coursera/Udemy logins do not carry over** — sign in inside that window
(`$B handoff` → sign in → `$B resume`), or import cookies with `/setup-browser-cookies`. One-time,
roughly two minutes.

**Fallback trigger, named in advance:** if Coursera or Udemy blocks the automated Chromium, or the
session will not hold across captures, stop and install Claude-in-Chrome instead — it drives real
Chrome with sessions already signed in. gstack's anti-bot stealth is **untested against these two
sites specifically**; both are more aggressive than average. If it fails it will fail on the first
Coursera capture, cheaply.

Two things to respect while driving it:

- Starting a quiz or marking a lesson complete **writes to a real enrolment history**. Screenshots
  are read-only; those two steps are not. Use a throwaway free course, not one that matters, and
  confirm before any mutating step.
- Automated access may breach Coursera's and Udemy's terms of service. Low practical risk at this
  volume, signed in as ourselves, screenshots for internal design reference only — but it is a
  decision taken knowingly.

Manual capture (the user walks the flow and sends images) remains valid and lower-risk, and is what
was used for the admin UI work. It stays available for any single screen gstack cannot reach.

**Order of work:** build `$B` → capture the six no-login references (nothing needed from the user)
→ `$B connect` and sign in → capture the 13 Coursera/Udemy shots with responsive variants.
Artifacts land in `.gstack/browse-reports/<stamp>/screenshots/`.

**Not for this job: REA** (`github.com/morluto/rea`). Evaluated 2026-11-18 and rejected. It is a
reverse-engineering MCP server — its stated purpose is to inspect an app without its source and
"build a version for your project," which is precisely what standing rule 4 and the original brief
forbid for a client product. Its web capability is incidental, it says nothing about authenticated
sessions, and the refs where internals would matter (Moodle, Canvas, Frappe) already ship source.

## Verification status

- The OneFile, Moodle, Totara, Frappe Learning and Interplay findings came from web searches run
  2026-11-18. Sources are listed in that session's chat history.
- Everything concerning **Coursera, Udemy, Codecademy, Canvas, Credly, Figma/Markup.io and the
  GOV.UK Design System is from model memory (knowledge to ~May 2026), not verified against the
  current products.** Treat specific layout claims as approximate until the screenshots are in.
- The claim that OneFile's interaction design is dated is an opinion, not a verified fact.
- Coursera and Codecademy both redesign frequently. Codecademy's path UI is the detail to trust
  least.
