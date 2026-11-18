# NFCAP: how we build (development approach v1.0)

Written by Chief of Staff (Zunkiree AI office) on 2026-11-18 from Sadin's decisions. Ticket: **OPS-177**.
The method is copied from how **Zone POS** works. The canvas recipe below came from the Zone POS lead session.
**V** = checked in the Zone POS repo; **M** = from memory, so verify before relying on it.

Read this file after `docs/HANDOFF.md` in every NFCAP session. It adds _how we work_; it does not change
_what we build_. If it conflicts with a chat message, this file wins until someone changes it.

## Scope: what we build (unchanged)

- **The build plan is `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`**, with
  `docs/client/NFCAP_LMS_Feature_Detail_Client.md` behind it. This is Manjila's approved plan
  (65 features, 9 phases) and it is **the priority**. Nothing in this file adds or removes a feature.
- Decisions closed in `docs/product/PRODUCT_CONTEXT.md` and the client scope doc stay closed.
- Mock up the product as scoped. Don't invent features. If a mockup exposes a gap in the plan, raise it
  as a Plane ticket for Manjila; don't fold it in silently.

## Who does what

- **Manjila** leads NFCAP. Zunkiree leads on content: Manjila approves wording and structure and brings
  Sadin in where he wants a say. NFCAP (the client) sees the work later on a **screen share**, not through
  shared links.
- **Two Claude sessions, never one:**
  - **Lead / QC session.** Owns the design canvas (sitemap, design direction, journeys, mockups), writes a
    brief for each ticket, and checks the builder's work against the boards. **It does not build.**
  - **Builder session.** Builds one ticket per branch from the lead's brief. Every handoff ends with a
    **Not verified** list. **It does not check its own work.**
- Before accepting a ticket, the lead re-runs every gate itself: `npm run lint`, `npm run build`,
  `npm test` (and `npm run test:e2e` where Docker is available), and compares the result with the board.
  It then writes an acceptance comment on the Plane ticket.
- **The approver is never the pusher.** Manjila's PRs are approved by Anish.

## Order of work (gates)

Each step is approved before the next starts. Approvals are recorded on the Plane gate ticket.

1. **Sitemap** (NFCAP-3). Every route, which screen it shows, which role sees it, which plan phase builds it.
2. **Design direction** (NFCAP-4). Tokens, type, colour, components and states. Source:
   `docs/design/NFCAP_DESIGN_SYSTEM.md`. `NFCAP_DESIGN_TOKENS.md` is marked STALE: don't use it.
3. **User journeys** (NFCAP-5). One per role, end to end: learner, admin, coordinator, partner staff, plus
   the WIOA funding flow. Section 2 of the build plan (the 10-step trainee journey) is the starting point.
4. **All mockups** (NFCAP-6). One board per screen, including phone, empty, error and permission states.
5. Then build, ticket by ticket, in plan-phase order. The builder builds; the lead checks against the board.

Phases 0 and 1 are already built (see `docs/build/PHASE_0_PROGRESS.md`, `PHASE_1_PROGRESS.md`). Boards
for screens that already exist are marked `exists` or `extend`, not redrawn from scratch.

## The design canvas (recipe from Zone POS)

**Owner:** Manjila, in her own claude.ai account. She shares it with Sadin with **edit** rights (M: with a
view-only share, Sadin can't fix a board himself). Put the canvas URL and its owner at the top of
`docs/MOCKUP-INDEX.md` on day one (M: shared artifacts may not show in someone else's list).

**Create it (V):**

- **Find the type.** Use the Artifact tool with `action: "quickstart", intent: "design"` to find the
  **Design** type.
- **Create the canvas.** Make ONE publish call with `type_url` = that type's link,
  `title: "NFCAP Mockups"` and `auto_open: "after_first_write"`, and nothing else.
- **Then use the returned `url`.** Every later call uses it; never send `type_url` again.
- **Follow the type's own instructions,** which come back with the create call. Where they differ from
  this file, the type wins.
- **Starting files:** `project/canvas.json` (the index) and `project/Main.dc.html` (the entry). After
  that, one board per file, written and sent one at a time.

**Structure (V, Zone POS pattern):**

- **Index.** `canvas.json` has sections: `notes` with `kind: "title1"` above each row of boards.
- **Section 0, Maps:** `SITE01-Sitemap`, `SITE02-Journeys`, `SITE03-RoleAccess`, `SITE04-SurfaceMap`,
  `SITE05-NavPerRole`.
- **Section 1, Foundations:** `FND01-Tokens`, `FND02-Buttons`, `FND03-FormControls` and so on. This
  section _is_ the design direction.
- **Tokens:** one shared `project/nfcap.css` built from `NFCAP_DESIGN_SYSTEM.md`. Every board links it
  with `<link rel="stylesheet" href="nfcap.css">`.
- **Shared parts:** things like the app shell and sidebar are separate `.dc.html` files pulled in with
  `<dc-import>`, and each one also renders as its own board.
- **Board names:** `<AREA><NN>-<PascalName>.dc.html`. Proposed areas: SITE, FND, LRN (learner),
  ADM (admin), CRD (coordinator), PTN (partner staff), WIOA, RPT (reports), SET (settings). The lead may
  change these and records the final list in MOCKUP-INDEX.md.
- **Board titles** end with `Phase n · status`, where status is `exists`, `extend` or `new`, compared with
  the code on `stage`.

**Docs in git (hand-written, V):**

- `docs/SITEMAP.md` is the authoritative map: route → screen → board → ticket → plan phase → roles, plus
  numbered journeys (J1…) and rules (R1…).
- `docs/MOCKUP-INDEX.md` lists every board with its phase, status and **approval**.
- When sources disagree: **ticket acceptance criteria > board > SITEMAP > build plan.**

**Approval (per board):**

- Each board is approved with a canvas comment "Approved" from Manjila, or from Sadin where he reviews.
- Copy it into the Approved column of MOCKUP-INDEX.md with who and when.
- A change to an approved board needs a new approval, recorded the same way.

**Syncing boards into the repo (V; only once a QC harness exists):** Artifact `read` on the canvas `url`
with `paths` = canvas.json, nfcap.css, shared imports and boards, `out_dir: qc/boards`; write the canvas
version to `qc/boards/VERSION`; keep `qc/boards/` git-ignored. Porting the Zone POS visual harness gets its
own ticket later.

## Three mistakes Zone POS made (V, shortened)

1. **"Close enough" counted as done.** Write the 100%-match rule down before building. Compare real
   screenshots with the boards, never an agent's description. Most rework came from drift: copy, letter
   case, pill colours, overflow on phone.
2. **Plans lived only in chat.** Twice a builder's context was cleared and an approved plan existed only in
   messages. Write every approved plan to `docs/plans/` or the ticket the moment it's approved.
3. **Boards promised what the build couldn't show:** sample values implying fields that don't exist, missing
   controls, no phone states. Mock **data** is never binding; layout, copy and states are. Draw phone,
   empty, error and permission states up front.

## Plane and branches

- **Board:** NFCAP on Plane (workspace `zunkireelabs`). Use `/project-pm` for "status", "what's mine?",
  "start NFCAP-n", "sync". Details: `.claude/skills/project-pm/`.
- **Branches:** `feature/NFCAP-n-short-name` → PR to `stage` → `main`. PR title `NFCAP-n: …`.
- **States:** In Progress → **QC Accepted** (lead's acceptance comment) → In Review (PR open) →
  On Stage (merged to `stage`) → Done (live in production). **Only Sadin moves a ticket to Client Review.**
- **Found-by labels:** tag every bug `found-by-qc`, `found-by-qe`, `found-by-dev` or `found-by-client`.
- **`tasks/TRACKER.md`** is generated by `/project-pm sync` and is the only to-do list. Never hand-edit it.
  ⚠️ This repo is **public** today: don't commit the tracker until Sadin confirms the repo is private.
- Machine setup for Plane: `INSTALL.md`.

## Timeline

- **Delivery date given by Sadin: end of December 2026.** ⚠️ TBD: the build plan is ~1,431 hours
  (~18 weeks with two engineers), which does not fit six weeks. Manjila and Sadin confirm what ships by end
  of December (the full canvas? which phases?) and record it here. Does not block the gates below.
- Week of 18 Nov: sitemap, then design direction. Week of 23 Nov: journeys and the first mockups. The lead
  proposes the rest once the sitemap shows how many screens there are.
