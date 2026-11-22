# UI Revamp — Session Log

Continuity log for the admin/learner UI revamp effort, so a fresh session (same machine or a
different one) can pick up exactly where this one left off. Branch: `feature/phase-0-quality-foundations`.
This is a running log, not a decision doc — `docs/design/NFCAP_DESIGN_SYSTEM.md` and
`docs/build/ADMIN_UI_REVAMP_BACKLOG.md` are the durable references; this file just tracks state.

## Where things stand (end of 2026-11-18 session)

### Admin UI (built 2026-11-17, not yet touched today)

Full build from yesterday is typechecked/linted clean and committed-ready, but has real visual
gaps vs. the live template reference — see **`docs/build/ADMIN_UI_REVAMP_BACKLOG.md`** for the
itemized list (8 open items: sidebar brand lockup, Quick Create not reading as a CTA, missing nav
section grouping, header icon buttons still old-styled, typography mismatch, broken-looking
Evidence Status chart bars, a real rendering bug in the Performance Highlights avatar stack,
general spacing density). None of those were fixed today — still open.

### Dashboard — decided today, not yet built

Yesterday's `/admin` Dashboard (`src/app/admin/DashboardView.tsx`) was built around the template's
**academy** page shape (KPI row + Needs Review queue + Evidence Status chart + Performance
Highlights). Today, comparing against a screenshot the user flagged as "the exact design/layout I
want," we identified that screenshot is actually the template's **`/dashboard/default`** page, not
academy — three components:

- `MetricCards` — 4 KPI cards, each: icon chip (top-left, `bg-muted` rounded square) + label
  (`CardDescription`) + big number + trend `Badge` + caption line.
- `PerformanceOverview` — "Customer Activity"-style card: title + description + period/segment
  `Select` filters + "View report" button in the header, then an area+line `ComposedChart` with a
  legend.
- `SubscriberOverview` — a titled `Card` (count in the title, description, Export button) wrapping
  the same `RecentCustomersTable`/TanStack pattern already used for `LearnersRosterView.tsx`.

**Decision: full swap.** Rebuild `/admin`'s Dashboard around this exact structure, replacing the
Needs Review / Evidence Status / Performance Highlights panels entirely. KPI metrics stay the same
(Learners / Courses / Pending Reviews / Active Learner Rate) just restyled to the `MetricCards`
pattern. The `PerformanceOverview`-equivalent needs **new data aggregation** — nothing in
`src/lib/data/progress.ts` currently buckets enrollments/activity by date; that's new work, not a
restyle. The `SubscriberOverview`-equivalent is mostly free — it's the same table pattern already
built, just needs the card-with-title/description/export wrapper.

**Not yet built. This is the next concrete implementation task when resumed.**

### Learner UI — direction DECIDED 2026-11-18, nothing built

> **This section below is superseded.** The learner UI direction was settled on 2026-11-18. Current
> state lives in two docs:
>
> - **`docs/design/LEARNER_UI_REFERENCES.md`** — the reference set (4 visual + 6 structural, plus the
>   admin reference), per-screen mapping, the brand decision, the capture tooling decision, audience
>   rules, and 11 rejected candidates with reasons.
> - **`docs/design/DESIGN_CANVAS_ROADMAP.md`** — the plan to render all of it as one Design canvas:
>   6 pages, 87 named boards, build order, the screenshot pipeline, and the open questions.
>
> **What changed from the text below:**
> - The locked-brand tension is **resolved**: navy/red is **dropped**, not kept. Replacement is
>   graphite ink + one mid-tone accent + a reserved status triad. `NFCAP_DESIGN_SYSTEM.md` is
>   superseded for colour and type (kept for its contrast math, focus-ring technique and the four
>   card states).
> - Coursera-primary / Udemy-sidebar-only is **superseded** by the 10-reference set. Codecademy,
>   GOV.UK Design System, OneFile, Moodle, Canvas, Credly and Figma pins were all added; Khan
>   Academy became written audience rules; the apprenticeship vendors were rejected as
>   unverifiable.
> - The browser-access question is **answered**: gstack `browse` (installed, bun present), with
>   Claude-in-Chrome as the named fallback. REA was evaluated and rejected.
> - Scope widened from learner-only to the whole system, because the canvas covers all four roles.

#### Original text (2026-11-18, superseded)

User wants a **complete revamp** of the learner-facing UI (Home, Course Catalog/Explore, My
Learning, Portfolio, Certificates, Funding/WIOA, course player, quiz view) — this is new scope,
not part of the original admin-only plan.

**Important, unresolved tension:** `docs/design/NFCAP_DESIGN_SYSTEM.md` is marked
**"Status: decided and implemented"** — navy/red brand tokens, Geist font (explicitly chosen over
Inter), and specific component state rules (active/available/locked/completed course-card
treatments) were built from a real provided brand mockup and are already live in `LearnerHeader`,
`PathwayCourseCard`, and Learner Home. **A "complete revamp" has not yet been explicitly reconciled
against this locked decision** — next session should get an explicit answer: keep the locked
brand/colors and revamp layout/components on top of it, or override the brand system too. Do not
assume either way.

**Design reference direction, decided today:** Coursera as primary visual reference, Udemy only
for the course-player/curriculum-sidebar specifics. Rationale (full reasoning in chat history):
trade apprentices are more likely to have used Udemy/Coursera than niche ed-tech products, so
familiarity lowers onboarding friction; and the parts of Coursera that are well-designed (course
player, "My Learning" dashboard, in-lesson quiz, certificate-earned moment) map directly onto
NFCAP's existing structure. Explicitly **excluded**: catalog/browse/discovery UI, ratings/reviews,
pricing/cart — NFCAP has no catalog to browse, no multi-provider marketplace, and is WIOA-funded
not self-serve-paid, so those Coursera/Udemy patterns don't apply and shouldn't be copied.

Earlier in the session, also considered and set aside (not rejected, just not the chosen
direction): Duolingo (progress/streak/unlock psychology), Codecademy (linear skill-path
visualization — structurally closer to NFCAP's actual shape than Coursera), Khan Academy
(restraint, built for a non-expert audience). Worth revisiting if Coursera/Udemy direction doesn't
land well once mocked up.

**Blocked on:** actual reference screenshots. This session has no browser/computer-use tool
available (no Claude-in-Chrome, no browser pane, no computer-use — confirmed via `ToolSearch`), so
I can't access the user's logged-in Coursera/Udemy sessions myself. Investigated `gstack`
(Garry Tan/YC's open-source Claude Code skill pack at `c:\Users\sthas\Projects\gstack`, MIT
licensed) as a possible path — it ships its own `/browse` + `/connect-chrome` skills that could
drive a real Chrome session, explicitly as a **replacement** for the official Claude-in-Chrome
extension (its own install instructions say to tell Claude Code to never use
`mcp__claude-in-chrome__*` and use `/browse` instead). **Not installed** — would need cloning into
`~/.claude/skills/gstack`, running its `./setup`, and `bun` (not currently on this machine). Decision
not made on whether to install it, install the real Claude-in-Chrome extension instead, or just have
the user send screenshots manually (the lowest-effort option, what we've been doing for the admin
work).

**Still waiting on from the user:** either (a) screenshots of Coursera's course player / "My
Learning" dashboard / certificate-earned page and Udemy's course player, or (b) a decision to set up
one of the browser-access paths above.

### Competitor/market research done this session (informational, no action items)

- Flooring-trade training/certification competitors: **CFI**, **NWFA**, **INSTALL** (direct content
  competitors — who else certifies flooring installers).
- Apprenticeship-management + WIOA-funding platform competitors: **Craft Connect**, **BuildWithin**,
  **Elevate317** (closest feature-for-feature matches — LMS + apprenticeship + WIOA case management
  combined), plus pure WIOA case-management players **myOneFlow**, **Geographic Solutions**,
  **CivicForce**. Caveat: these came from vendor marketing pages, not independent reviews — treat
  feature claims as unverified. Full source list in chat history if needed again.
- Established this isn't really a "Coursera competitor" situation — Coursera is a MOOC marketplace,
  NFCAP is a single-pathway, WIOA-funded, verified-evidence apprenticeship credential tool. Closer in
  *product structure* to a corporate/compliance LMS (Docebo/TalentLMS-shaped: assigned pathway, not
  browsed) than to Coursera's discovery-driven marketplace — even though Coursera was still chosen as
  the *visual* reference for specific screens (see above).

## Next session — concrete pick-up points, in likely order

*Updated 2026-11-18. Items 1 and 2 of the original list are resolved — see the learner-UI banner
above.*

1. **Run the screenshot capture.** Six references plus the admin template need no login and nothing
   from the user: Codecademy, Moodle (`demo.moodle.net`), OneFile provider guides, GOV.UK Design
   System, Credly, Canvas docs, `studio-admin.arhamkhnz.com`. Then the 13 Coursera/Udemy shots,
   which need a signed-in session. Tooling and the capture list are in
   `docs/design/LEARNER_UI_REFERENCES.md`; the pipeline into the canvas is in
   `docs/design/DESIGN_CANVAS_ROADMAP.md`.
2. **Answer the three blocking open questions** (roadmap → Open questions): how open courses are
   discovered, whether Home and My Learning are one screen or two, and whether the new palette
   propagates into admin (which decides one foundations page or two).
3. **Create the Design canvas**: `project/nfcap-app.css` first, then the `fnd` page.
4. Build the Dashboard full-swap to the `default`-page structure (see above) — no open question,
   just needs implementing, including the new date-bucketed enrollment/activity aggregation. Note
   this deletes backlog items 6 and 7 rather than fixing them.
5. Work through the remaining items in `docs/build/ADMIN_UI_REVAMP_BACKLOG.md`.
6. Build the learner UI revamp proper, against the canvas.
