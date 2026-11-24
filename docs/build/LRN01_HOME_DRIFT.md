# LRN01-Home drift — found 2026-11-24, not fixed

`docs/plans/mockup-complete-build.md`'s 3A table claimed `LRN01-Home` was "Matched (Step 1.4).
Verify only." It is not. Re-read `project/LRN01-Home.dc.html` directly against
`src/app/learner/HomeView.tsx` on 2026-11-24.

## What the board actually has that the code doesn't

- **Announcement banner** — a prominent "New: Mentor Messaging" banner directly under the
  greeting. Entirely absent from the code.
- **Course Catalog section** — a 3-card discovery grid for courses the learner hasn't enrolled in
  yet (lesson count, level pill, duration pill, Enroll button). Entirely absent.
- **"Up next" lesson list** — below the featured Continue-Learning hero card, a table-style list
  of further upcoming lessons (thumbnail, course tag, content/completion/deadline columns, Start
  button). The code only has the one hero card, no list.
- **Portfolio-evidence preview** — 3 individual evidence pieces ("Setting the First Row," etc.)
  with "Met" verification chips, tagged by course. The code shows **Certificates** (per-course
  completions) in that slot instead — a different concept, not a styling variant of the same one.
- **"To be reviewed" sidebar panel** — items pending Admin review (quiz, assignment). Entirely
  absent.
- **Real mentor** — the board shows an assigned mentor (name, title, avatar initials, "Message
  mentor" button). The code always shows "Not yet assigned." This isn't a styling gap — **there is
  no mentor-assignment concept anywhere in `prisma/schema.prisma`.** Building this for real needs
  a schema addition (who assigns a mentor, to which learner, and how `Message mentor` differs from
  general messaging) before any UI work, same shape as Layer 1's other additions.
- **Sidebar certificates list** — a compact list with per-certificate download buttons, separate
  from the main-column content. The code has no equivalent.
- **3 stat tiles beside the greeting** (Modules completed, Certificates earned, Avg. quiz score),
  no photo hero. The code has **4** stats (adds "Pathway progress," not on the board) inside a
  diagonal-photo hero banner that doesn't exist on the board at all.
- **`LearnerFooter`** — the board imports it (`nested`). The code never renders it. (Separately
  fixed as part of building `LRN09-PublicVerify` the same day — `src/components/layout/
  LearnerFooter.tsx` now exists as a real component, just not wired into `HomeView.tsx` yet.)

## Root cause — not a skipped task

`git log --follow -- src/app/learner/HomeView.tsx` shows exactly one substantive retrofit,
commit `5ef751b` ("Design system: retrofit Learner Home to LRN01-Home," 2026-11-22, PR #11,
merged to `stage` in `c8075e0`). That commit's own message is detailed and honest about its
tradeoffs (mentor stub, conditional evidence-task card, a real bug found and fixed via Playwright
screenshot) — this was genuine, careful work, not negligence.

But the commit describes building *"a diagonal-photo hero with a 4-stat strip, a Continue
Learning featured card, pathway module cards, a certificates list, and a sidebar (Upcoming,
mentor, funding status, evidence-task reminder, promo banner)"* — which is what the code still
does today, and which matches **none** of what the board contains as of 2026-11-24 (no photo
hero, 3 stats not 4, no promo-banner-as-described, plus the six missing sections above).

Two Artifact reads in the same 2026-11-24 session returned different version strings:
`Sidebar.dc.html`/`nfcap.css`/`LearnerFooter.dc.html` at `1795458174-b680`, `LRN01-Home.dc.html`
(read later the same session) at `1795481843-6de0` — a later version. The most likely explanation:
**the canvas board was revised again after the Nov 22 retrofit** — simplifying the hero and adding
the announcement banner, catalog, portfolio preview, and review panel — and nothing re-checked the
screen against the canvas after that.

## The actual gap this exposes

`docs/plans/mockup-complete-build.md` has a rule to verify status against `stage`'s real git
history, never a stale plan doc (standing rule 9). There is **no equivalent rule for "verify
against the canvas's current version, never the one you compared against originally."** The
canvas is a living document (`docs/MOCKUP-INDEX.md` is full of board revisions after initial
publish); a "Matched" claim has an implicit expiration the moment the board changes again, and
nothing here detects that. Worth raising as a process gap, not just a one-off bug.

## What this means for the rest of the "matched" Learner list

`LRN02`, `LRN07`, `LRN08`, `LRN11`, `LRN12`, and the auth pages all carry the same "Matched (Step
1.4), verify only" claim from the same batch (PR #11/#12, same date). Given `LRN01` and
`LearnerFooter` both turned out to be false from that exact batch, **none of the remaining ones
should be trusted without re-reading the live board**, the same way `LRN01` just was. Not done in
this session — next concrete task.

## Before fixing LRN01 itself

This is not a quick fix — it's close to the size of building a new board from scratch:

1. **Mentor assignment** needs a real schema decision first (new model/field — who assigns whom,
   to which learner) — same shape as a Layer 1 addition, done properly rather than bolted onto
   this one screen.
2. **Announcement banner** is now buildable — the `Announcement` backend exists (Layer 1,
   2026-11-24) — but nothing surfaces an announcement to Home yet.
3. **Course Catalog section** and **Portfolio-evidence preview** need new data-loader work on
   `/learner`'s page (not-yet-enrolled courses; evidence pieces with Met verdicts) — doable from
   existing models, no new schema needed.
4. **"To be reviewed" panel** needs a query for "what's pending review across this learner's
   quizzes/evidence" — doable from existing models.
5. **Sidebar certificates list + wiring `LearnerFooter`** are the two genuinely small pieces here.

Recommend scoping this as its own unit of work, not a drive-by fix, given point 1 alone reopens a
data-model question.
