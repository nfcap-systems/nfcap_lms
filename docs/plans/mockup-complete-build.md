# Mockup-complete build — board-driven plan

Written 2026-11-24. **Goal: the codebase implements the approved design canvas completely — UI,
structure, behaviour and logic — not just a re-skin of the screens that already exist.**

Canvas: `https://claude.ai/artifact/6othp9hKDpwXeLJsWtkt3Y` (163 files, ~140 real boards).

## Strategy (user decision, 2026-11-24)

**Work is driven by the boards, not by the scope plan's phase order.** Each work unit is a board or
a board cluster. Every unit is **tagged with the scope feature and phase it draws down**, so the
client still sees progress against the approved 65-feature / 1,431h plan in
`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` — we just don't execute in phase order.

Role order, also the user's decision: **Learner → Admin → Coordinator + Partner.**

**This supersedes** `docs/plans/admin-ui-parity.md` (its Batch A work is folded in as L0/A1 below;
its progress log stays valid as detail). It does **not** supersede
`docs/plans/phase-3-and-design-migration-kickoff.md` as the record of what Phase 3 already shipped.

### Why foundations still come before boards

Board-driven ordering is only safe if the shared layers are built first. Three concrete examples of
what happens otherwise:

- **Cohorts** (`ADM13`, Phase 6) adds a `Cohort` model that the Learners roster (`ADM03`), the
  Dashboard (`ADM02`), and the Enrollment tab (`ADM04c`) all display. Match those three screens
  first and you rebuild them when Cohort lands.
- **Messaging** (`ADM26`/`LRN14`/`LRN15`, Phase 6) puts an Inbox entry point in the staff shell —
  which every single ADM/CRD/PTN/WIOA/RPT board imports.
- **Per-criterion evidence** (Phase 3 #9–#11) changes evidence from one file per submission to
  files per criterion, which rewrites the review screens (`ADM11`, `ADM12`) and the learner
  evidence screens (`LRN06` family) at the same time.

So: **Layer 0 → Layer 1 → Layer 2 → then role clusters.** Layers 0–2 are not optional and not
reorderable.

---

## LAYER 0 — CSS custom-property collision (blocks every screen, all roles)

Two token systems define the same bare custom-property names, and `src/app/admin/layout.tsx`'s
`data-system="staff"` wrapper made them fight. `src/app/design-tokens.css` (110 lines, nfcap canvas
tokens) vs `src/app/globals.css` (256 lines, `@import 'tailwindcss'` + the shadcn admin-ui theme,
which maps bare names into Tailwind's `--color-*` namespace via `@theme inline` at lines 155–187).

Import order is `tailwindcss` → `design-tokens.css` → `design-system.css` → globals' own rules, so
globals' `:root` beats design-tokens' `:root`, and `[data-system='staff']` beats both inside Admin.

### Confirmed collisions

| # | Token(s) | Effect | Severity |
| --- | --- | --- | --- |
| **A** | `--radius-sm/md/lg` (and `--radius-xl` under staff) | design-tokens' `:root` overrides **Tailwind v4's reserved radius scale** (v4: sm 4px, md 6px, lg 8px, xl 12px; design-tokens: sm 4, md 8, lg 12; staff: sm 6, lg 10, xl 14). **Every `rounded-*` utility app-wide is shifted, and shifts again inside Admin.** Affects Learner too. | Critical, app-wide |
| **B** | `--shadow-sm/md/lg` | Same mechanism — overrides **Tailwind v4's reserved shadow scale**. Every `shadow-*` utility app-wide. *Not previously flagged; found 2026-11-23.* | High, app-wide |
| **C** | `--accent` (+ `--accent-foreground`) | shadcn's `--accent` is a near-**white** subtle-hover background (`oklch(0.97 0 0)`) feeding `bg-accent`/`hover:bg-accent`. Staff redefines it as near-**black** (`oklch(0.205 0 0)`) — a different role entirely — and does **not** redefine `--accent-foreground`, which stays near-black. Inside Admin, `bg-accent` + `text-accent-foreground` = **black on black**. This is the Quick Create / topbar bug. | Critical (Admin) |
| **D** | `--border` | Both at `:root`; globals wins app-wide, so the Learner palette's approved `#e5e7eb` is dead. Staff's value matches globals by coincidence. | Low, silent |
| **E** | `--sidebar-border`, `--sidebar-primary` | Same names, same values. Nothing broken; breaks the moment either side changes. | Low, fragile |
| **F** | `--font-mono` | globals wins; both resolve to Geist Mono. | Trivial |

**Not collisions** — leave alone: `--ink*`, `--surface*`, `--status-*`, `--space-*`, `--motion-*`,
`--chart-approved/pending/rejected`, `--focus-ring-*`, `--accent-hover`, `--accent-contrast`,
`--radius-full` (v4's `rounded-full` is hardcoded to `calc(infinity * 1px)`),
`--text-body-size`/`--text-body-line`.

### Verify A and B in devtools before fixing

My reading is from the import graph, not the browser. Two minutes, and the whole fix hangs off it:
inspect a `rounded-lg` element outside Admin (expect **12px**, not Tailwind's 8px); the same class
inside `/admin` (expect **10px**); a `shadow-sm` element against design-tokens'
`0 1px 2px rgba(15,23,32,0.06)`; the Quick Create button (expect background and text near-identical).
If any disagree, stop and re-derive.

### Fix — prefix only the colliding names

Rename in `design-tokens.css` to `--nfcap-*`: `--radius-sm/md/lg/xl`, `--shadow-sm/md/lg`,
`--accent` + `--accent-hover` + `--accent-contrast` (rename the group together), `--border`,
all `--sidebar-*`, `--font-mono`. Then update every reference in `src/app/design-system.css`
(1862 lines) and `src/`:

```
grep -rn "var(--accent\|var(--border\|var(--radius-\|var(--shadow-\|var(--sidebar-\|var(--font-mono" src --include=*.css --include=*.tsx | grep -v src/generated
```

Leave every non-colliding token at its nfcap name — that's what keeps board → code porting
mechanical. **Record the rename mapping in a comment block at the top of `design-tokens.css`** so a
future port knows nfcap.css's `--accent` is our `--nfcap-accent`. Without that comment the prefix
becomes a trap.

### Then the literal class diff the user asked for

One batched pass, not reactive spot-fixes: read `project/nfcap.css` (52KB) in full, list every nfcap
class the shells and already-retrofitted screens use, and diff each rule **literally** against
`nfcap.css`. The `.mcard` bug already found (independently rewritten — wrong radius token, flat
background instead of gradient+shadow, wrong font size/weight) proves these were ported by eye.
Assume every other class is wrong until checked.

**Branch:** `fix/design-token-collision` → one PR → `stage`.

---

## LAYER 1 — One data-model design pass (the "mapped with one another" layer) — DONE 2026-11-24

**Design doc, migration, and backend actions all done** — `docs/build/LAYER1_DATA_MODEL_DESIGN.md`,
migration `20261124000000_add_layer1_models` (applied to the live DB, confirmed by direct query —
see the migration-apply incident in `CLAUDE.local.md`), and `src/lib/actions/`+`src/lib/data/` for
every model below. **No UI built on any of it yet** — that's each board's own Layer 3 row above.

Verified against `prisma/schema.prisma` (32 models, before this pass) — none of the below existed
before 2026-11-24.

| New model / field | Boards it unlocks | Scope feature | Phase | Hours |
| --- | --- | --- | --- | ---: |
| `Cohort`, `CohortMembership`, deadlines | `ADM13-Cohorts`, `ADM03` roster's Pathway/Cohort column, `ADM04c` Enrollment tab, `ADM02`, `RPT01` cohort trends | Cohorts & Deadlines | 6 | 24 |
| `Announcement` + audience targeting + read state | `ADM14`, `LRN01-Home`'s announcement banner | Announcements | 6 | 14 |
| `Notification` + read/unread + type | `ADM18-NotificationsPanel`, the topbar bell on **every** staff board, Learner header | Notification Coverage Completion | 6 | 18 |
| `MessageThread`, `Message`, participants, read state | `ADM26-Inbox`, `ADM22-InboxEmpty`, `LRN14`, `LRN14b`, `LRN15`, the Inbox button in the staff shell | Trainee ↔ Staff Messaging | 6 | 36 |
| ~~`PhotoAnnotation`~~ | ~~`ADM12`, `ADM11`~~ | **DONE on stage** — shipped as `CriterionAssessment.annotationData` (Json, normalized 0–1 coords) + `src/lib/types/annotation.ts`, not a separate model. PR #20. | 3 #8 | ~~20~~ |
| ~~`CriterionEvidenceFile`~~ | ~~`LRN06b/06c`, `LRN06d/e/f`~~ | **DONE on stage** — shipped as fields on `CriterionAssessment` (`learnerFilePath`, `learnerFileName`, `learnerDescription`, `submittedAt`, `carriedForward`), not a separate model. PRs #20/#21. A better design than this plan's: per-criterion capture lives on the existing verdict row. | 3 #9–#11 | ~~64~~ |
| Learner activity timestamp (new field, or surface `CompletedLesson.completedAt`) | `ADM03`'s three-tier `.av-dot`, `ADM02` Recent Learners, `RPT01` at-risk flags | Admin Reporting Depth | 6 | — |
| Point-in-time status history / snapshots | `ADM02`'s trend badges (render `—` today), `RPT01` trends | Admin Reporting Depth | 6 | 28 |
| Credential public verification token / slug | `LRN09-PublicVerify` | Public Verification Page + QR | 4 | 20 |
| Portfolio share token | `LRN07`'s "Share your portfolio" panel | Shareable Verified Portfolio | 4 | 18 |
| Eligibility question set + result | `LRN10b-EligibilitySelfCheck` | Eligibility Self-Check | 5 | 20 |
| Stalled-case rule (**likely computed, not stored** — decide in this pass) | `CRD05-StalledCases` | Stalled-Case Detection | 5 | 20 |
| Question banks, random order, attempt limits | `LRN05`, `LRN05b`, `LRN05c` | Quiz Engine Depth | 6 | 32 |

### Cross-cutting rules this pass must settle — these are the scalability decisions

1. **One read-state pattern, not three.** Notifications, Announcements and Messages all need
   per-user read/unread. Design a single shared receipt pattern once.
2. ~~`CriterionEvidenceFile` design~~ — **moot, already solved on stage.** The evidence grain is
   already per-criterion via `CriterionAssessment`'s learner-capture fields (PRs #20/#21,
   migrations `20261123120000_add_criterion_capture_and_annotation` and
   `20261123150000_add_criterion_carried_forward`). **Read those two migrations and the
   `CriterionAssessment` doc comments before designing anything evidence-adjacent** — they encode
   real decisions (carried-forward Met verdicts are excluded from attempt history; annotations are
   reviewer-only and never surfaced to the learner).
3. **RLS policies for every new model.** `src/lib/db/rls.ts`'s `withRlsContext`, per Phase 1.
   Remember the infinite-recursion bug in `app_can_access_case`/`app_can_access_learner`
   (migration `20261117050000`) — helper functions that reference the tables they guard recurse.
4. **Audit entries for every new mutating action** (`AuditLog`).
5. **Performance conventions apply to all of it** (`CLAUDE.md`): no `force-dynamic`; a
   `loading.tsx` for every new route segment; narrowest `select`, never a new `courseInclude` call
   site; no per-entity queries in a loop; `'use client'` at the leaves; nothing inside
   `$transaction` but database writes.
6. **Media delivery decision is due here, not at launch** — the scope doc puts it in Phase 3
   explicitly, because storage architecture is expensive to change once features depend on it.
   Cloudflare Stream vs Mux, adaptive HLS either way. Still undecided.

**Branch:** `feature/data-model-design-pass` → the design doc first (review before code), then the
migration set.

---

## LAYER 2 — Shared shell + interaction boards (every role, every screen) — IN PROGRESS

**Real premise correction, found 2026-11-24**: this layer's own table assumed one shared staff
shell. There are two — see `docs/build/LAYER2_SHELL_FINDINGS.md` for the full writeup. Nothing
below is built yet; the finding only narrows what building it actually requires.

| Work | Boards | Notes |
| --- | --- | --- |
| Staff shell | `Sidebar.dc.html`, `FND13-Shells`, `ADM01-Shell` | **Not one shell — two.** `/admin` uses `admin-shell/AppSidebar.tsx` (shadcn-based, reasonably matched — `QuickCreateMenu` already wired, nav section labels already match the board). `/coordinator`+`/partner` use `components/layout/AppShell.tsx`→`Sidebar.tsx` (hand-built `.sshell-*` classes, never ported from `Sidebar.dc.html` at all) — this is the one with `docs/MOCKUP-INDEX.md`'s undiagnosed banner/layout-overflow bug, now narrowed to "a page's content, not the shell container" (checked the CSS and `AppShell.tsx` directly; the height-containment chain is sound on paper — needs a real browser to actually find it). Neither shell has the board's Quick Create row, Inbox button, or promo banner; building those needs either a product decision (what does Coordinator/Partner "quick create"?) or a feature that doesn't exist yet (the banner's numbers come from Cohorts/stalled-case-detection, neither wired to UI). |
| Learner shell | `LearnerHeader.dc.html`, `LearnerFooter.dc.html` | `LearnerFooter` was claimed "already matched" but **didn't exist anywhere in the app** until built 2026-11-24 for `LRN09-PublicVerify` — same drift pattern as `LRN01-Home`. `LearnerHeader` itself still unverified against its board. |
| Interaction/state boards | `ADM18-NotificationsPanel`, `ADM19-QuickCreateMenu`, `ADM20-AvatarMenu`, `ADM21-SearchPalette`, `ADM23-RowActionsMenu`, `ADM24-DeactivateConfirm`, `ADM25-ReviewQueueEmpty`, `ADM22-InboxEmpty` | Shell-wide. Real equivalents exist for several (`GlobalSearch`, `NotificationsMenu`, quick-create dialogs, `NavUser`, `/admin/roles` deactivation) but **parity against these boards was never checked** — verify each before building. `ADM18`/`ADM22`'s backing models (`Notification`/`MessageThread`) exist now (Layer 1, 2026-11-24); no UI. |
| Foundation classes | `FND01`–`FND14` | Already ported into `design-system.css`; Layer 0's literal diff is the check — done. |

---

## CANVAS STREAM — runs in parallel, owned by the lead/QC session

Decisions 2 and 3 (2026-11-24) are **design-canvas work, not code work**. Per
`docs/DEV-APPROACH.md` the canvas is the **lead/QC session's** responsibility — the builder session
does not draw boards. These run in parallel with Layers 0–2 and must land before the Learner items
that depend on them.

| ID | Work | Blocks | Why |
| --- | --- | --- | --- |
| **C1** | **Redraw `LRN10-FundingStatus`'s step timeline to match the real implementation**, following the existing LRN board pattern. Add boards for any real state not already drawn — the family already covers intake (`LRN10e`), no-office-matched (`LRN10f`), outreach dialog (`LRN10g`), requirements dialog (`LRN10h`), empty (`LRN10d`) and checklist (`LRN10c`), so check each against the live screen before drawing anything new. Also confirm whether `LRN10i-Appointments` needs a learner route. | 3A Funding | The code has more working funding states than the board draws. The board is the thing that's wrong here, not the code. |
| **C2** | **Draw a board for `/learner/profile`.** Decide its ID and canvas position (next to `LRN11-Account`, which is the closest sibling). | 3A Profile | The route exists and has real content (courses, progress map, credentials, member-since); no board was ever drawn for it. |
| **C3** | *Follow-on, not a decision yet:* close the `docs/MOCKUP-INDEX.md` backlog items that affect boards this plan builds against — `ADM13-Cohorts`, `ADM10-ReviewQueue`, `ADM17-Roles` and `WIOA01-Boards` are **still on the pre-canonical table pattern**, not the locked `.dtcard` pattern from `ADM03`. 3B retrofits those routes to `ADM03`'s pattern regardless, so the boards should be brought in line or they'll contradict the code. | 3B (soft) | A board that disagrees with the shipped screen is worse than no board. |

**Canvas working rules** (from `docs/MOCKUP-INDEX.md` and prior session decisions — not optional):
iterate in a local standalone file under `temp_ss/`, screenshot it, and **publish to the Artifact
only after the user verifies the local render** — never iterate directly in the Artifact. Announce
the board (id + what it covers) before drawing. Pad board heights generously — `canvas.json`'s `h`
is the real visible frame and over-tall beats clipped. Use the uploaded trade photography where the
real screen shows an image, not flat colored divs. Promote any repeatable local `<style>` into
shared `nfcap.css` as one unit rather than leaving it board-local. Update **both**
`docs/MOCKUP-INDEX.md` and `Main.dc.html`'s own cover page afterwards.

**One standing hazard:** `nfcap.css` is the source of truth that `src/app/design-system.css` is
ported from. If C1/C2/C3 change `nfcap.css`, Layer 0's class diff must be re-run against the new
version. **Sequence the canvas stream's `nfcap.css` edits before Layer 0's diff, or after it — not
during.**

---

## LAYER 3 — Role clusters

Each cluster = one branch, one PR, **one browser pass by the user at the end** (one login per
role — this is the point of role-wise ordering).

### 3A — LEARNER (first, per user decision)

| Board(s) | Route | State | Scope / phase |
| --- | --- | --- | --- |
| `LRN01-Home` | `/learner` | **"Matched" claim is WRONG — found 2026-11-24.** Re-read the live board directly against `HomeView.tsx`: no announcement banner, no Course Catalog discovery section, no "Up next" lesson list, no Portfolio-evidence preview (code shows Certificates instead — a different concept), no sidebar "To be reviewed" panel, no real mentor (schema has no mentor concept at all), `LearnerFooter` never wired in, 3 stats on the board vs 4 in code. Root cause confirmed via git history: commit `5ef751b` (Step 1.4, Nov 22, PR #11) genuinely retrofitted this screen and was visually verified via Playwright — but its own commit message describes building "a diagonal-photo hero with a 4-stat strip," which doesn't exist anywhere in the board read 2026-11-24. Artifact version strings differ (`1795458174-b680` on files read earlier same session vs `1795481843-6de0` on this one) — the canvas was very likely revised again after the Nov 22 retrofit, and nothing caught the drift. **Needs scoping as real work, not a quick fix** — see `docs/build/LRN01_HOME_DRIFT.md`. | needs rework |
| `LRN02`+`02b`+`02c`, `LRN07`+`07b`, `LRN08`+`08b`, `LRN13`, `LRN11`, `LRN12`, auth | `/my-learning`, `/portfolio`, `/certificates`, `/explore`, `/account`, `/signup`, `/login` etc. | **"Matched" (Step 1.4), but given `LRN01`'s claim just turned out false, treat as unverified until each is actually re-read against the live canvas, same way `LRN01` was.** Confirm the 5 empty-state splits exist in code too — `StateCard` currently appears in **no** learner component, only Admin/WIOA ones. | unverified — check each before trusting |
| `LRN04`, `LRN05`, `LRN05b`, `LRN05c` | `/learner/courses/[courseId]` | **Token sweep only, never structurally matched.** **Decision 2026-11-24: build the boards' own structure** — overview (`LRN03`) → player (`LRN04`) → quiz (`LRN05`→`05b`→`05c`) as discrete screens, not one combined screen. This is a restructure of the real route, not a reskin. Quiz depth (banks, random order, attempt limits) comes with it. | 6 — Quiz Engine Depth (32h) |
| `LRN03-CourseOverview` | **no route — build one** | Syllabus/overview screen before the player. **Decision 2026-11-24: build it as drawn.** Today the app jumps straight into `/learner/courses/[courseId]`; this becomes the course's landing screen with the player behind it. | unscoped — raise against Curriculum & Pathway |
| `LRN06`, `LRN06b`, `LRN06c`, `LRN06d`, `LRN06e`, `LRN06f` | evidence flow, `/learner/courses/[courseId]/attempts/[criterionId]` | **ALL BUILT on stage** (PRs #20–#22): `GuidedEvidenceCapture.tsx` (`LRN06b/06c`), `EvidenceNotMet.tsx` (`LRN06d/06e`), `AttemptHistoryView.tsx` + a real route (`LRN06f`), criteria checklist in `EvidenceView.tsx` (`LRN06`). **Verify parity against the boards; do not rebuild.** | 3 — done |
| `LRN10`+`10c`/`10e`/`10f`/`10g`/`10h`, `LRN10d` | `/learner/funding` | Token sweep only. **The code is ahead of the board.** **Decision 2026-11-24: redraw the canvas to match the code** (stream **C1**), following the existing LRN board pattern — then retrofit the route to the redrawn board. **Blocked on C1.** | 5 — Funding Progress Transparency (28h) |
| `LRN10b-EligibilitySelfCheck` | **BUILT 2026-11-24** — `/eligibility` | Read the board directly, ported literally (chromeless top bar, back+counter, one-question-per-screen pattern). Seeded exactly the one real question drawn on the board; no result screen was drawn, so eligible/not-eligible reuses the shared StateCard pattern. Backend: `submitEligibilityCheck`. | 5 (20h) — done |
| `LRN10i-Appointments` | **no route found** | `Appointment` model exists; Coordinator schedules into it. Learner-facing view unverified. | 5 |
| `LRN09-PublicVerify` | **BUILT 2026-11-24** — `/verify/[slug]` | Read the board directly, ported literally. Also built `LearnerFooter.tsx` (the board's shared footer component, which had never existed in the app despite this table once claiming it was matched — same drift pattern as `LRN01`). Backend: `getPublicCredentialBySlug`/`generateCertificatePublicSlug`. Not yet wired: nothing calls `generateCertificatePublicSlug` from `LRN08-Certificates`'s "Earned cards open the same LRN09 Verify view," so there's no real slug reachable from the app yet. | 4 (20h) — done |
| `LRN14`, `LRN14b`, `LRN15` | **no route** | Backend exists now (Layer 1, 2026-11-24): `MessageThread`/`Message`/RLS, `startThread`/`sendMessage`. No UI. | 6 (36h) |
| — | `/learner/profile` | **No board was ever drawn.** **Decision 2026-11-24: draw one** (stream **C2**), then build the route to it. **Blocked on C2.** | parity |
| `LRN04b-PlayerPhone`, `LRN06c-EvidenceCapturePhone` | — | **Phone-frame boards. DEFERRED by decision 2026-11-24.** Recorded so it isn't mistaken for done: the Learner UI is effectively non-responsive (6 responsive utilities total across `src/components/learner` + `src/app/learner`), and evidence capture on a phone is a real job-site use case. Revisit before launch. | deferred |

### 3B — ADMIN (second)

Furthest from matched. Exercises the staff shell hardest, so it shakes out Layer 2 bugs before 3C.

| Board(s) | Route | State | Scope / phase |
| --- | --- | --- | --- |
| `ADM02`+`02b`, `ADM03`, `ADM16` | `/admin`, `/admin/learners`, `/admin/audit` | **Built, uncommitted** on `feature/admin-ui-parity-dashboard-learners-audit`. Re-check against boards once Layer 0 lands, then commit. `npm run build` has never run on it. | parity |
| `ADM04` + `ADM04b–f` | `/admin/learners/[learnerId]` | 6-tab profile. Primitives exist (`ProfileHeader`/`CompletionRing`/`ProfileTabs`, Step 1.3). Respect the board's role boundaries: Funding tab is a **restricted-info notice**, Documents' WIOA row a non-downloadable pointer — both deliberate and scope-grounded. | parity |
| `ADM05`, `ADM08`, `ADM17` | `/admin/courses`, `/admin/pathway`(+detail), `/admin/roles` | Mechanical — `DataTableCard` family already exists. | parity |
| `WIOA01`–`WIOA04` | `/admin/wioa/*` | Two are dialog-heavy. Retrofit to the locked `.dtcard` pattern from `ADM03`, **not** to `WIOA01`'s own stale table. | parity |
| `ADM10`, `ADM25`, `ADM11` | `/admin/reviews`, review screen | Shipped (#6, #7). **#7's certification gate was merged CI-green with no manual pass** — see §Verification debt. | 3 (done) |
| `ADM12-PhotoAnnotation` | inside the review screen | **BUILT on stage** (PR #20) — `src/components/admin/PhotoAnnotationDialog.tsx`, `.tool` class in `design-system.css`. **Verify parity; do not rebuild.** | 3 — done |
| `ADM13-Cohorts` | **no route** | `Cohort`/`CohortMembership`/`CohortDeadline` + CRUD actions exist (Layer 1, 2026-11-24). No UI. | 6 (24h) |
| `ADM14-AnnouncementsNotifications` | **no route** | `Announcement`/`Notification` + actions exist (Layer 1, 2026-11-24). No UI. | 6 (14+18h) |
| `ADM15-DataInOut` | **no route** | CSV enrol + export. | 6 (18+14h) |
| `ADM26-Inbox`, `ADM22-InboxEmpty` | **no route** | Messaging models + RLS + actions exist (Layer 1, 2026-11-24). No UI. Also blocked on Layer 2's real finding: Admin and Coordinator/Partner use two different sidebar implementations, not one shared shell — see Layer 2 row below. | 6 (36h, shared with `LRN14/15`) |
| `RPT01-AdminReporting` | `/admin/analytics` | **11-line placeholder rendering the word "Future".** Hide from nav until built. | 6 — Admin Reporting Depth (28h) |
| `SET01-AdminSettings` | `/admin/settings` | Same placeholder. **Board content itself still needs a product decision.** | undecided |
| `ADM06-CurriculumBuilder` | `/admin/courses/[courseId]` | **Deferred deliberately** — `CurriculumBuilderView.tsx` is 1353 lines and churned by Phase 3 (#4 extended it, #8 will). Retrofit after #8. | parity |

### 3C — COORDINATOR + PARTNER (third, together)

They share the staff shell Layer 2 hardens. Mostly **verification**, not build.

| Board(s) | Route | State | Scope / phase |
| --- | --- | --- | --- |
| `CRD01`, `CRD02`, `CRD03`, `CRD04` | `/coordinator`, `/coordinator/[caseId]` | Matched in Step 1.4 (`.dtcard` list, 3-tab detail). `CRD03`/`CRD04` live inside the detail tabs. | done |
| `PTN01`, `PTN02` | `/partner`, `/partner/[caseId]` | Matched in PR #12 — real Partner components, not Coordinator's reused ones. | done |
| `RPT02-FundingImpact` | `/coordinator/reports`, `/partner/reports`, `/admin/wioa/reports` | Matched. Board's requested-vs-approved chart dropped — no "requested amount" field exists. | 5 (22h, mostly done) |
| `CRD05-StalledCases` | **no route** | Stalled-case detection + follow-up. | 5 (20h) |
| Coordinator Appointments view | **no route** | `docs/MOCKUP-INDEX.md` flags that appointments belong to the Coordinator, not Admin, and a styled draft already exists in `temp_ss/adm02-wip.html`'s history — carry it over, don't redesign. | 5 |
| **All of the above** | — | `docs/MOCKUP-INDEX.md`: **nobody has visually confirmed `CRD01`–`CRD05`, `PTN01/02`, `RPT01/02` or `SET01` since publish**, and the per-role data-boundary checklist was never verified board-by-board. 3C is where that closes. | verification |

---

## Scope ledger — what this draws down

Board-backed work remaining, by phase. Hours from the scope doc, not estimated here.

| Phase | Total | Already shipped | Board-backed remaining |
| --- | ---: | --- | ---: |
| 3 — Evidence & Competency | 260h | **COMPLETE** — all 11 engineering features merged (PRs #13–#22) | **0h** (only #5, 12h of NFCAP trade-expert sessions, is non-engineering — confirm with the client whether it's considered delivered) |
| 4 — Credential Integrity | 80h | PDF Certificate (20h), Public Verification (20h, scope-reduced — QR dropped), Shareable Portfolio (18h) — 58h shipped, merged to `stage` via PR #24. Expiry & Renewal Reminders (22h) dropped by decision, not outstanding — see `docs/build/PHASE_4_PROGRESS.md` | **0h — functionally complete**, pending client sign-off on both dropped-scope decisions |
| 5 — Funding Productisation | 130h | part of Funding Impact Reporting | **~130h** |
| 6 — Communication & Operations | 184h | — | **184h** |
| **Board-backed total** | | | **~394h** |
| UI parity (Layers 0/2 + 3B retrofits) | not in the 65-feature plan | | unestimated, ~80–120h |
| 7 — Accessibility, 8 — Hardening & Launch | | | **stay phase-wise** — no boards drive them |

**Timeline, honestly:** ~394h of board-backed work plus parity is roughly **5–6 weeks with two
engineers**, double that with one — before Phases 7 and 8. **Phases 0, 1, 2 and 3 are all
complete**, so this is consistent with the approved ~18-week / 1,431h plan, not a departure from
it. **It does not land before a client presentation.** What a presentation shows is the canvas plus
the working slice — which is now a substantial slice, since Phase 3 is the product's starred core —
with this ledger as the roadmap.

> **Corrected 2026-11-24.** This plan was first written believing Phase 3 had ~110h left. It did
> not: PRs #20, #21 and #22 (Photo Annotation, Guided Capture, Feedback/Resubmission, Attempt
> History, Legacy Regression) had already merged to `stage`, 8 commits ahead of the branch this
> plan was written on. The ledger, Layer 1 and the 3A/3B tables above are corrected. **Check
> `stage` before trusting any status claim in any plan doc** — that is exactly the drift
> `docs/MOCKUP-INDEX.md`'s own maintenance rule warns about, and it happened here too.

---

## Decisions — settled 2026-11-24

1. **Course player structure — build it as the mockups draw it.** `LRN03` overview → `LRN04` player
   → `LRN05`/`05b`/`05c` quiz as discrete screens. `LRN03` gets a real route. This is a
   **restructure** of `/learner/courses/[courseId]`, not a reskin — scope it accordingly, and raise
   `LRN03` against Curriculum & Pathway since it was previously unscoped.
2. **Funding — redraw the board, not the code.** The code is correct and ahead of the canvas.
   Canvas stream **C1**, following the existing LRN board pattern.
3. **`/learner/profile` — draw a board.** Canvas stream **C2**, then build the route to it.
4. **Mobile/responsive — deferred.** `LRN04b`/`LRN06c` stay undelivered. Logged in the 3A table so
   it isn't later mistaken for done; revisit before launch.

### Still open, not blocking 3A

5. **Media delivery** — Cloudflare Stream vs Mux (scope doc puts this decision in Phase 3).
6. **Cohort intake model** — how does NFCAP actually run intakes? (scope doc flags this against
   Cohorts & Deadlines).
7. **Credential expiry** — the remaining Phase 4 open question (portfolio sharing is built, see
   `docs/build/PHASE_4_PROGRESS.md`).
7b. **QR code dropped, 2026-11-25** — user decision: the `/verify/[slug]` link itself is the
   verification mechanism, no QR graphic will be built. Client scope doc still names a QR code;
   needs client sign-off, see `docs/build/PHASE_4_PROGRESS.md`.
8. **`SET01-AdminSettings` content** — still has no product decision.

---

## Standing rules

1. **No Playwright. No per-item visual verification.** Verification is `npx tsc --noEmit` +
   `npm run lint` + `npm run format:check`, then the user's own browser pass **once per role
   cluster**. This is a deliberate reversal — per-feature browser runs cost the user a full day.
2. **One PR per layer or cluster**, never per file or per screen. CI + review round-trips were the
   other half of that day.
3. **Flag before any commit or push, every time.** Verify `git status` first.
4. `git config --global --add safe.directory C:/Users/sthas/Projects/nfcap_lms` before any git use.
5. **Never `npm run build` while a dev server is live** — check
   `netstat -ano | grep LISTENING | grep ":3000"` (`CLAUDE.local.md` #2).
6. **Leave these pre-existing uncommitted changes alone** (another session's):
   `.gitignore`, `docs/MOCKUP-INDEX.md`, `docs/plans/phase-3-and-design-migration-kickoff.md`.
7. **Read the board before building the screen** (`Artifact` → `action: "read"` →
   `path: "project/<Board>.dc.html"`), and match the board **for that role's own route** —
   `CLAUDE.local.md` #1 is what happens otherwise.
8. **Don't fabricate data to fill a board.** If a board shows a field the schema lacks, that's a
   Layer 1 item, not an invented column.
9. **Verify status against `stage`, never from a plan doc.** `docs/build/PHASE_3_PROGRESS.md` was
   stale (claimed "all 12 not started") and was fixed on `stage` in `9753e2b` — but this plan was
   itself written off a branch 8 commits behind and inherited the same error. Before acting on any
   "not started" or "remaining" claim: `git fetch && git log --oneline <your-base>..origin/stage`.
10. **Run `npx prisma generate` after any merge that touches `prisma/schema.prisma`.**
   `src/generated/prisma` is gitignored, so a merge brings the schema without a matching client and
   every downstream type error looks like a real conflict. Restart the dev server too —
   `CLAUDE.local.md` #3.

---

## Verification debt to clear early

Phase 3 #7 (**Per-Criterion Review & Gated Certification**) was merged on CI-green alone by explicit
instruction, with no manual pass. Its own progress-log row flags that the **gate's refusal path** —
a certificate blocked because a `mandatoryForCertification` criterion is Not Met — was never
confirmed in a browser. That is the client's own starred acceptance criterion, enforced in exactly
one place: `applyEvidenceStatus` in `src/lib/actions/progress.ts`. **One manual round-trip, before
it is demoed as working.**

---

## Progress log

Accuracy rule, same as the Phase 3 tracker: update the moment a state changes, verify against real
`git`/`gh` state, never write "merged" without checking it merged.

| Layer / cluster | Branch | PR / merge commit | State | Date |
| --- | --- | --- | --- | --- |
| L0 — Token collision rename | `feature/admin-ui-parity-dashboard-learners-audit` | **PR #23, MERGED to `stage`** (`cf95afe`) | **Done.** Renamed `--radius-sm/md/lg/xl`, `--shadow-sm/md/lg`, `--accent`/`--accent-hover`/`--accent-contrast`, `--border`, `--sidebar-*`, `--font-mono` to `--nfcap-*`. `tsc`/`eslint`/`prettier` clean. | 2026-11-24 |
| L0 — Literal nfcap.css class diff | `feature/admin-ui-parity-dashboard-learners-audit` | **PR #23, MERGED to `stage`** (`cf95afe`) | **Done.** Diffed `nfcap.css` vs `design-system.css` programmatically via `postcss`; fixed 7 real deviations (`.btn-secondary`, `.tcheck`, `.av`/`.note-av`/`.pring .avatar`, `.av-dot.active`, `.pagehdr h1`, `.dtsearch`). | 2026-11-24 |
| L1 — Data-model design pass (doc) | `feature/admin-ui-parity-dashboard-learners-audit` | `ffd9d36`, not pushed | **Done.** `docs/build/LAYER1_DATA_MODEL_DESIGN.md` — every cross-cutting decision settled (read-state pattern, RLS scope, stalled-case computed-not-stored, quiz depth design). | 2026-11-24 |
| L1 — Migration set | same | `ffd9d36`, not pushed | **Done, APPLIED to the live DB** — confirmed by direct query (`information_schema`/`to_regclass`), not just `prisma migrate status`. Real incident along the way: shipped in the same session as dependent backend code with no `migrate deploy` run, broke `/learner` at runtime — see `CLAUDE.local.md` #8 and commit `a3fac1a` for the fix (`predev` now gates on `prisma migrate status`). | 2026-11-24 |
| L1 — Backend actions (new, not in original plan — real build output) | same | `df4668c`, not pushed | **Done.** `src/lib/actions/`+`src/lib/data/` for Cohorts, Announcements, Notifications, Messaging (RLS), stalled-case detection, credential/portfolio share tokens, eligibility scoring, quiz-pool/shuffle/attempt-limit logic. No UI. | 2026-11-24 |
| L2 — Staff shell + interaction boards | same | `fdff64b`, not pushed (docs only) | **Investigated, not built.** Real premise correction: two shells, not one — see `docs/build/LAYER2_SHELL_FINDINGS.md`. Overflow bug narrowed, not fixed (needs a real browser). | 2026-11-24 |
| L2 — Learner shell verify | same | — | **Partially done, with a bad result.** `LearnerFooter` claimed "matched" but didn't exist — built it 2026-11-24 (commit `2c59e17`) while doing `LRN09`. `LearnerHeader` itself still unverified. | 2026-11-24 |
| C1 — Redraw `LRN10` funding timeline (canvas) | n/a — canvas | n/a | Not started — lead/QC session's job, not builder's | |
| C2 — Draw `/learner/profile` board (canvas) | n/a — canvas | n/a | Not started — lead/QC session's job, not builder's | |
| C3 — Bring 4 stale boards onto the `.dtcard` pattern (canvas) | n/a — canvas | n/a | Not started — lead/QC session's job, not builder's | |
| 3A — Learner: `LRN09-PublicVerify` | `feature/admin-ui-parity-dashboard-learners-audit` | `2c59e17`, not pushed | **Done.** `/verify/[slug]`, read the board directly, ported literally. Not wired: nothing calls `generateCertificatePublicSlug` yet, so no real slug is reachable from the app. | 2026-11-24 |
| 3A — Learner: `LRN10b-EligibilitySelfCheck` | same | `bcf1ac8`, not pushed | **Done.** `/eligibility`, read the board directly, ported literally. One real seeded question (the board's own example); no fabricated content. | 2026-11-24 |
| 3A — Learner: `LRN01-Home` | same | not pushed | **Rebuilt 2026-11-24** to match the board, with one deliberately-scoped exception. Added: announcement banner (real `Announcement` data, Layer 1), Course Catalog discovery section, "Up next" row below the Continue hero, Portfolio-evidence preview (flattened from `credentials`), "To be reviewed" panel (real pending-evidence query), moved Certificates into the sidebar as a compact list (download disabled — Phase 4, same disclosure `CertificatesView.tsx` already uses), stripped the hero down to the board's plain 3-stat greeting (was a 4-stat photo banner). **Still not built: the mentor panel** — no mentor-assignment model anywhere in `prisma/schema.prisma`; left as "Not yet assigned" rather than fabricate a name or button. `tsc`/`eslint`/`prettier` clean; not yet visually confirmed in a browser. | 2026-11-24 |
| 3A — Learner: other "matched" boards (`LRN02`+`02b`+`02c`, `LRN07`+`07b`, `LRN08`+`08b`, `LRN13`, `LRN11`, `LRN12`, auth, `LearnerHeader`) | — | — | **Re-checked 2026-11-24 — confirmed real drift, same pattern as `LRN01`.** Full findings in `docs/build/LRN_BATCH_DRIFT.md`. `LearnerHeader` and `LearnerShell`'s page-body wrapper are now fixed (see rows above/below). Still open: `LRN02b-PathwayLocked` and `LRN07b`/`LRN08b` empty states are unbuilt or wrong-condition; `LRN11-Account` is missing its entire sidebar; `LRN13-OpenCourseEnrol` has a **product-logic contradiction** (board: self-pay/no-eligibility-check; code, confirmed correct by the user: staff-assigned/restricted — the board needs redrawing, not the code); `LRN16-AuthFlow` still doesn't exist on canvas, so `/login` etc. have no board at all; mentor assignment (blocks part of `LRN01`/`07`/`08`/`13`) still has no schema. | 2026-11-24 |
| L2 — `LearnerShell` page-body fix | same | not pushed | **Fixed 2026-11-24**, found while rebuilding Home. `.lshell-card` (a page-wide bordered card) and the fixed 1280px `.lshell-main` matched no board — removed/corrected to the board's real `max-width:1300px;margin:0 auto;padding:36px 24px 56px` pattern (the majority case: Home/Portfolio/Certificates/Explore). My Learning/Account's boards use 1140px and still render ~160px too wide until each gets its own override. See `docs/build/LRN_BATCH_DRIFT.md`. | 2026-11-24 |
| 3A — Learner: `LRN02`/`02b`/`02c`, `LRN07`/`07b`, `LRN08`/`08b`, `LRN11` | same | not pushed | **Fixed 2026-11-24.** My Learning: honest locked-course copy (real `CourseUnlock` mechanism, not the board's "complete X to unlock" wording — same pattern applied to `LRN08`'s locked tier and `LRN01`/`HomeView`'s pathway strip), real `LockedCourseDialog` modal, empty state matches `LRN02c`. Portfolio: real evidence thumbnails, working "Share your portfolio" link, empty state matches `LRN07b`. Certificates: 4th stat added, "How verification works" copy corrected (it wrongly said public verification was Phase 4/unavailable — `LRN09` already shipped), real "Copy verify link" per certificate, empty-state condition fixed to `credentials.length === 0` (was `pathway.length === 0`, rendering the wrong screen for the common case). Account: sidebar built (profile summary, security tip, support link; "Learner ID" omitted — no such field exists, not fabricated). `LRN12`/`LRN13`: **no code change**, user-confirmed — both boards encode a narrative (address-at-signup; self-pay enrollment) that contradicts already-correct product behavior; flagged for the canvas, not the code. | 2026-11-24 |
| 3A — Learner (overview/player/quiz restructure) | same | not pushed | **Built 2026-11-24** — `LRN03-CourseOverview`, `LRN04-Player`, `LRN05`/`05b`/`05c` (`CourseOverviewView`, `LessonPlayerView`, `QuizFlow`). `LRN05b`'s chromeless quiz-question chrome is a fixed full-screen overlay above the shared header, not a Next.js layout/route-group restructure. `EvidenceView` (already matching its boards, Phase 3) relocated to its own `/evidence` route, internals untouched. `CourseLearningView.tsx`/`QuizView.tsx`/`LessonSidebar.tsx` deleted (fully superseded, no other importers). A later pass added `RestrictedCourseNotice` and fixed a real deep-link gap the new routes had (didn't re-check restricted-course access the way the Overview page did) — verified correct, kept. Question-bank pool/shuffle (`Assessment.questionsPerAttempt`/`randomizeOrder`, Layer 1 schema fields) still isn't wired to any selection logic — same gap as before this restructure, not newly introduced. | 2026-11-24 |
| 3A — Learner (funding) | | | Blocked on C1 | |
| 3A — Learner (profile) | | | Blocked on C2 | |
| 3B — Admin (Batch A) | `feature/admin-ui-parity-dashboard-learners-audit` | **PR #23, MERGED to `stage`** (`cf95afe`) | **Merged.** `npm run build`/`tsc`/`lint` clean. **Visual pass still owed by the user — never confirmed.** | 2026-11-24 |
| 3B — Admin (remaining) | | | Not started (backend for `ADM13`/`ADM14`/`ADM26` exists now, see L1 row) | |
| 3C — Coordinator + Partner | | | Not started | |
