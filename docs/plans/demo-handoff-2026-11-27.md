# DEMO track — handoff from the lead session, 2026-11-27

**Written when the lead/planner session closed.** Everything below is carried forward by an
executor session. Read this with `docs/plans/demo-feedback-2026-11-27.md` (the register of what
the client raised) and `docs/plans/demo-1-2-3-coordinator-wioa-plan.md` (the plan, including §7's
QC log).

**Not this track's work:** the Phase 6 notifications + WIOA upload-cap work
(`docs/plans/notifications-and-upload-cap-kickoff.md`) is owned by a different session with its
own worktree at `../nfcap_lms-wt-notif2`. Do not touch it.

---

## 1. State at handoff

| Item | State |
| --- | --- |
| `stage` (local = origin) | reconciled; the DEMO-3 merge and this session's docs commits are all on it |
| **Ticket A** (DEMO-3 + S1–S4) | **merged** — `0233313`, PR #37, merge commit `10e3274`. **Static QC passed. Runtime QC never ran.** |
| **Ticket B** (DEMO-1 + DEMO-2) | not started. Design preview exists; no board, no code |
| DEMO-4 … DEMO-7 | not started |

**Nothing is in production.** `stage` has still never been promoted to `main`.

### Live environment left running

A **production build** is on disk and `npx next start` was running on **port 3100** when this
session closed. It may still be up, or may have been killed with the session — check before
assuming. It points at the staging Supabase, which is the only database; that was explicitly
approved, so writing real data during verification is expected, not a hazard to avoid.

**Do not run `npm run dev` while a production build or `next start` is live** — both write to
`.next/` and running them together corrupts it (`CLAUDE.local.md` #2).

---

## 2. The one thing that must happen next

**Ticket A's runtime QC (criteria 1–6) has never been run.** It is merged and unverified. The
full brief is in §3 below. The two criteria that matter most are the two easiest to report as
passing without being true:

- **Criterion 2** — a learner must be able to *actually open* the course after `TUITION_APPROVED`.
  A `CourseUnlock` row existing is not the test. `CLAUDE.local.md` #9 is exactly this trap, and
  when it was walked into before, four separate UI surfaces disagreed with the real gate.
- **Criterion 4** — an invalid transition must show its real message, not
  `Minified React error #441`. Must be checked in a **production** build; `next dev` does not
  minify and cannot reproduce it.

---

## 3. Executor brief — Ticket A runtime verification

> You are **not** accepting this work — report evidence, the lead signs off. Do not fix what you
> find; log it.
>
> Criteria: `demo-1-2-3-coordinator-wioa-plan.md` §3, **as amended by §7**. Read §7 first —
> three findings are already logged, criterion 1 has been reworded, and criterion 6 is already
> confirmed structurally.
>
> Environment: production build already on disk, `next start` on port 3100 (verify it is still
> up). Do not run `npm run dev` alongside it. The A6 migration is already applied
> (`npm run db:status` reports clean).
>
> Login: `coordinator@demo.nfcap.test` / `Demo1234!`. All demo accounts use that password.
>
> **Drive the real controls with agent-browser.** A direct URL open is not the same code path as
> the real flow (`CLAUDE.local.md` #10) — that mistake has already cost one long session here.
>
> 1. **Criterion 1 (as reworded):** advance a case `ETPL_TRAINING_REQUESTED →
>    TRAINING_AUTHORIZATION_PENDING → TUITION_APPROVED → APPRENTICESHIP_ENROLLMENT_COMPLETE`,
>    then take a *different* non-terminal case to `FUNDING_DECLINED` as a branch.
> 2. **Criterion 2:** then log in **as that learner** and open the course. Check Home, My Learning
>    (both tabs) and the Course Catalog — not just the course page.
> 3. **Criterion 3:** a learner with two funding requests shows two independently advanceable
>    sections with the correct course on each. Create a second request as the learner if none
>    exists.
> 4. **Criterion 4:** the select only offers valid options, so an invalid transition cannot be
>    produced by ordinary clicking. **Open the case in two tabs, advance in one, submit the stale
>    option in the other.** Paste what the browser shows. If it fails, check the server's own
>    terminal too — it prints the real error even when the client's copy is redacted
>    (`CLAUDE.local.md` #11).
> 5. **Criterion 6:** confirm the Partner Staff **payload**, not the screen.
>
> Report per criterion: what you did, what you saw. Screenshots for 2 and 4. End with a
> "Not verified" list (`docs/DEV-APPROACH.md`).

---

## 4. Ticket B — where the design got to

### The blocker that was found, and it is not a small one

**`CRD02-CaseDetail` was drawn against a data model that no longer exists.**
`docs/MOCKUP-INDEX.md:600` records the CRD boards as built on *"the real `WioaCaseStatus` enum and
its 6 UI phases."* That enum is gone — one historical reference survives at
`prisma/schema.prisma:383`. The 2026-11-25 master/course split replaced it with
`WioaEligibilityStatus` (14 statuses, **4** phases) plus a separate per-course
`WioaFundingStatus`.

So the approved board describes one blended pipeline; the code has two independent ones. **That is
precisely what DEMO-2 asks the screen to make obvious, and the board has no vocabulary for it.**
`CRD02` needs **redrawing, not amending**, and `CRD04-StatusRecording` should fold into it —
`CRD04` existing as its own board is *why* the advance control ended up buried in a tab called
"Status history," which is the plan's §1.2 confusion cause.

### Ticket B is presentation only

Verified: every piece of logic the redesign needs already exists in `src/lib/wioa/status.ts` —
`WIOA_UI_PHASES`, `WIOA_ELIGIBILITY_STATUS_PHASE` (full 14-status map), both status orders, both
label maps, both `*_NEXT_STEP` copy maps, and both `next*StatusOptions` functions. The data layer
already returns the full `fundingRequests[]` array. **No schema, no migration, no server action.**
React and CSS only.

Two small exceptions, neither structural: `FUNDING_DECLINED` must be excluded from the step
sequence rather than sitting in it (finding Q-2), and this component must stop reading the
back-compat `courseTitle` (finding Q-1).

### The design preview

**`temp_ss/crd02-preview.html`** (rendered: `crd02-preview.png`). **`temp_ss/` is gitignored** —
these files exist only in this working tree. Re-render with
`node temp_ss/_shot-crd02-preview.cjs`.

It is a **preview, not a board**: main column only, no sidebar. What it proposes:

1. **The three tabs are gone.** Everything about case progress is on one page; Documents, Status
   history, Appointments, Board contact and Communications become right-rail collapsible panels
   with count badges.
2. **Two levels of path.** Eligibility spans the top as 4 phases with the exact status named
   underneath (14 statuses cannot be 14 steps). Each course case is a card below carrying its own
   smaller path — the same component, smaller. **That visual rhyme is the DEMO-2 answer**, rather
   than a sentence explaining that the tracks are separate.
3. **Advance controls sit on their paths**, which is what gets the control out of the history tab.
4. **A terminal state replaces the path** rather than appearing as a step in it.
5. ETPL/authorization fields become grouped attribute rows under the step they belong to (plan A4).

### Two traps already hit in building that preview — do not repeat

- **Set `data-system="staff"`** on the page. Without it `--accent` is undefined and the current
  path step renders invisible. This also means: **the staff identity is near-monochrome by
  decision** (`--accent: oklch(0.205 0 0)`), approved at gate NFCAP-4 and flagged a one-way door.
  Do not introduce a blue accent on coordinator screens.
- **Full status labels do not fit chevron path steps.** `TRAINING_AUTHORIZATION_PENDING` clipped to
  "raining Authorization Pendin" at equal step widths — `CLAUDE.local.md` #5 again. The preview
  uses short names on the path with the real status spelled out beneath.

### Open design question

The preview's short path labels ("Requested", "Authorization", "Tuition", "Enrolled") **do not
exist anywhere in code** — `WIOA_FUNDING_STATUS_LABEL` holds the full ones. Either the board
specifies a second short-label map, or the path wraps to two lines and keeps the real labels.
A decision, not a detail. Unresolved.

### Still blocked

Per the plan §4, Ticket B needs the `CRD02` redraw approved and recorded in
`docs/MOCKUP-INDEX.md` before any build (`docs/DEV-APPROACH.md`: a change to an approved board
needs a fresh approval). **Do not build Ticket B from the preview alone.**

---

## 5. References

`docs/design/references/` — five screenshots supplied by the client on 2026-11-27, with a README
recording what each is for. Two things in it worth not rediscovering:

- **No reference shows a parent record with per-child pipelines.** That part of `CRD02` is
  designed, not copied. A web search for Greenhouse / HubSpot / Shopify equivalents was drafted
  and then dropped on the user's instruction to work from the supplied references only. If it is
  ever run, the question that matters is whether those products show child *paths* inline or
  child *rows* with click-through — Salesforce itself appears to do the latter, which would be an
  argument against the preview's approach.
- **Reference `01` places a failure outcome inline in the success path.** Do not copy that; it is
  the same defect as finding Q-2.

Reference `04` (the New Contact modal) is the best reference we have for **DEMO-5/DEMO-6**, not for
this ticket — grouped sections, a required-field legend, inline validation, and Country/State as
selects with Zip separate.

---

## 6. Open product questions — NFCAP's to answer, not an executor's

| # | Question | Blocks |
| --- | --- | --- |
| Q1 | Does a coordinator **record** a tuition decision made by the workforce board, or **make** it in-app? Ticket A was built as record-keeping. If it is the latter, the funding control needs approval semantics and an audit trail. | Ticket A's final shape |
| Q4 | Do all 12 ETPL/authorization fields still earn their place, or does some become derived? | A full resolution of A4 |
| DEMO-6 | Does any WIOA document requirement need more than one file? | The single-live-file model |
| DEMO-7 | Which screen's funding amount was wrong at the demo? | DEMO-7 entirely |

**An executor must not resolve any of these by choosing in code.**

---

## 7. Remaining order of work

1. **Ticket A runtime QC** (§3) — merged and unverified; highest priority.
2. **`CRD02` redraw** → approval recorded in `docs/MOCKUP-INDEX.md` → **Ticket B** build.
3. **DEMO-4** — an eligible learner is never told. Note this touches the notifications track's
   boundary; the part in scope here is what the learner's own Funding page shows at
   `WIOA_ELIGIBLE`.
4. **DEMO-5 / DEMO-6 / DEMO-7** — the signup form and USD currency work.

Also outstanding on these screens, from `docs/MOCKUP-INDEX.md`: a **live unresolved CRD sidebar
rendering bug** (banner/layout overflow, confirmed on the CRD family, fine on ADM), and the fact
that **nobody has ever visually verified `CRD01`–`CRD05` render correctly since publish**.
