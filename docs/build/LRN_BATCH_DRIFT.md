# Learner batch drift — found 2026-11-24, same session as LRN01_HOME_DRIFT.md

`docs/plans/mockup-complete-build.md`'s 3A table flagged the rest of the Step 1.4 "Matched"
batch as unverified, given `LRN01-Home` and `LearnerFooter` both turned out to be false claims
from that exact batch (see `docs/build/LRN01_HOME_DRIFT.md`). Re-read every remaining board
directly against its live component on 2026-11-24. None of them are clean matches either.

## Cross-cutting findings (app-wide, not page-specific)

- **`LearnerFooter` is never rendered anywhere in `LearnerShell`** — confirmed across every
  learner route checked (My Learning, Portfolio, Certificates, Explore, Account), not just Home.
- **"Mentor" (named mentor + "Message mentor" button) is drawn on 4 boards** (`LRN01-Home`,
  `LRN07-Portfolio`, `LRN08-Certificates`, `LRN13-OpenCourseEnrol`) **and built on none of them.**
  Root cause, confirmed in `LRN01_HOME_DRIFT.md`: there is no mentor-assignment model anywhere in
  `prisma/schema.prisma`. This is one blocked item, not four — don't fabricate a mentor UI per
  board; it needs a real schema decision first.
- **"Locked item names the specific blocking thing" pattern** is drawn on 2 boards
  (`LRN02-Pathway`'s module cards, `LRN08-Certificates`' locked tier) and missing from both —
  generic "Locked" text instead. Mechanical fix, same shape both places.
- **`LearnerShell`'s page body — structural drift, not cosmetic.** `LearnerShell.tsx` wrapped
  every learner page's content in `.lshell-card` — a single bordered/background/padded "card"
  around the whole page — inside a fixed 1280px-max-width `.lshell-main`. **No board does this.**
  Every board's real outer wrapper is just `max-width: Npx; margin: 0 auto; padding: ...` directly
  on the page's muted background; individual sections (sidebar panels, form cards) carry their own
  background/border only where the board actually draws one. Max-width also isn't one constant —
  boards with the 300px sidebar (`LRN01-Home`, `LRN07-Portfolio`, `LRN08-Certificates`,
  `LRN13-OpenCourseEnrol`) use 1300px; boards without one (`LRN02-Pathway`, `LRN11-Account`) use
  1140px. Fixed 2026-11-24: `.lshell-card` removed, `.lshell-main` corrected to the 1300px/36-24-56
  case (the majority). The two narrower-board pages (My Learning, Account) still render ~160px
  wider than their own board until each gets its own override — tracked, not silently left broken.
- **`LearnerHeader` — structural drift, not cosmetic.** The board (`LearnerHeader.dc.html`,
  imported by every learner board including `LRN01-Home` via `<dc-import name="LearnerHeader">`)
  is a **two-row header** (114px): Row 1 (68px) = brand icon+wordmark, a disabled "Ask AI" pill
  with a "Soon" tag, a search pill, then Messages icon / Notifications icon / a **persistent**
  avatar+name+role block. Row 2 (46px) = a separate underline-nav strip (Home / My Learning /
  Course Catalog / Portfolio / Certificates / Funding). The real code
  (`src/components/layout/LearnerHeader.tsx`) is a **single-row** header with nav collapsing to a
  hamburger below `lg`, an image-based logo (not icon+wordmark), no "Ask AI" button at all, and the
  account block showing only an avatar initial — name/email/role appear only inside the dropdown,
  not persistently in the bar.

## Per-board findings

| Board(s) | Route | Verdict | Gap |
| --- | --- | --- | --- |
| `LRN02-Pathway` | `/learner/my-learning` | Partial match | Locked cards show generic "Locked", not the specific blocking module |
| `LRN02b-PathwayLocked` | (modal) | DRIFT — unbuilt | No modal; board wants lock icon, named blocking module, progress count, "Back to {module}" CTA |
| `LRN02c-PathwayEmpty` | (empty state) | DRIFT | Code is a 1-line stub; board has illustration, WIOA copy, 2 CTAs, funding-status callout |
| `LRN07-Portfolio` | `/learner/portfolio` | Partial match | No evidence photo thumbnails; sidebar missing "Share your portfolio" panel; no mentor button |
| `LRN07b-PortfolioEmpty` | (empty state) | DRIFT | Generic box, wrong copy, no illustration/CTA/callout |
| `LRN08-Certificates` | `/learner/certificates` | Partial match | 3 stats vs board's 4; locked tier generic, not named; no sample-verification link; no mentor button |
| `LRN08b-CertificatesEmpty` | (empty state) | DRIFT — wrong condition | Code's empty branch fires on `pathway.length === 0` (no courses at all); board's condition is "has courses, zero certs earned" — the actual common case has no matching empty UI |
| `LRN13-OpenCourseEnrol` | `/learner/explore` | DRIFT — narrative-level | Board pitches self-pay/no-eligibility-check enrollment; code's copy says the opposite (staff-assigned, restricted) — **a product-logic contradiction, not a wording gap, needs a decision before fixing**. Also 3 stats vs 4, no mentor card |
| `LRN11-Account` | `/learner/account` | DRIFT | Entire right sidebar missing (profile-summary card with learner ID/member-since/funding badge, security tip, support panel) |
| `LRN12-SignUp` | `/signup` | Closest match | Board shows address as a single always-visible field; code gates it behind a "pursuing WIOA" checkbox with more fields than drawn |
| `LRN16-AuthFlow` | `/login`, forgot/reset/verify | Doesn't exist on canvas | Unchanged since the 2026-11-22 flag in `docs/MOCKUP-INDEX.md`. No board to check `/login` etc. against at all |
| `LearnerHeader` | shared, every learner route | DRIFT — structural | See above |

## Course detail/player/quiz flow — confirmed 2026-11-24, not a quick fix

Checked `LRN03-CourseOverview`, `LRN04-Player`, `LRN05-QuizPre`, `LRN05b-QuizQuestion`,
`LRN05c-QuizResult` against `src/app/learner/courses/[courseId]/page.tsx` +
`CourseLearningView.tsx` (+ `LessonContent`/`LessonSidebar`/`QuizView`). This confirms
`docs/plans/mockup-complete-build.md`'s own claim ("token sweep only, never structurally
matched") — and it's slightly worse than that one-line summary captures:

- **`LRN03-CourseOverview`: NOT BUILT, no route at all.** The board is a real landing screen
  (hero image, breadcrumb, 4 meta chips, 2-column body with a grouped lesson list and a sticky
  sidebar — progress bar, Continue button, "What you'll need" tool list, mentor contact card).
  Today `page.tsx` goes straight into `CourseLearningView`, a completely different IA.
- **`LRN04-Player`: partial, wrong IA.** The sidebar+content+Prev/Next pattern is conceptually
  similar, but it's one state inside a combined component, not a discrete player screen.
- **`LRN05-QuizPre`: not built as a discrete screen.** The board has a dedicated pre-quiz screen
  (question count/time limit/pass mark/attempts, "Start quiz" button) before any question shows;
  `QuizView.tsx` is just invoked directly as a step inside `CourseLearningView`.
- **`LRN05b-QuizQuestion`: real structural surprise.** The board uses **completely different,
  chromeless full-screen UI** for quiz-taking — no `LearnerHeader` at all, just a bare top bar
  (logo + "Exit quiz"), centered single-question layout. Everything else in the app (including
  quizzes today) stays inside the persistent sidebar layout — this is a deliberately
  distraction-free mode the code has no equivalent of.
- **`LRN05c-QuizResult`: likely partial at best** — a dedicated pass/fail + per-question review
  screen on the board; not confirmed whether `QuizView.tsx` has an equivalent, but it stays
  embedded in the same layout rather than becoming its own screen either way.

This matches `docs/plans/mockup-complete-build.md`'s own Decision #1 (2026-11-24): build `LRN03`
→ `LRN04` → `LRN05`/`05b`/`05c` as **discrete screens**, a real restructure of
`/learner/courses/[courseId]`, not a reskin — already scoped as its own unit of work (32h, Quiz
Engine Depth, Phase 6), not something to fold into the small alignment/parity fixes in this doc.

## What's fixable now vs. blocked

**Blocked on a real decision, not a quick fix:**
- Mentor assignment (schema) — blocks part of `LRN01`, `LRN07`, `LRN08`, `LRN13`.
- `LRN13`'s enrollment-model contradiction (self-pay vs staff-assigned/restricted) — a product
  decision, not a styling choice; the wrong one ships a false claim to learners about funding.
- `LRN16-AuthFlow` not existing — canvas work, not builder's job.
- `LRN01-Home` itself — scoped separately in `LRN01_HOME_DRIFT.md`, blocked on the same mentor
  decision for part of it.

**Fixable now, no new schema, no product decision:**
- `LearnerHeader` restructure (two-row layout, Ask AI disabled button, persistent name/role, icon+
  wordmark brand mark) — shared, do first.
- `LRN02b-PathwayLocked` modal, `LRN02-Pathway`'s named-blocking-module text.
- `LRN02c-PathwayEmpty`, `LRN07b-PortfolioEmpty`, `LRN08b-CertificatesEmpty` (fix the condition too).
- `LRN07-Portfolio`'s missing "Share your portfolio" sidebar panel, evidence thumbnails.
- `LRN08-Certificates`' 4th stat, named locked tier, sample-verification link.
- `LRN11-Account`'s missing sidebar.
- `LRN12-SignUp`'s field-gating difference (make address always-visible per the board) — flagged,
  not assumed, since it changes signup data-collection behavior.
