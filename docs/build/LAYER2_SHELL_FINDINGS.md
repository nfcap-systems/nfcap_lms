# Layer 2 — staff/learner shell findings (in progress)

Written 2026-11-24, continuing `docs/plans/mockup-complete-build.md`'s Layer 2 after Layer 0 and
Layer 1. Investigation so far, before any further code changes — recorded now because it
contradicts an assumption the plan's own Layer 2 table makes.

## Finding: there is no single shared staff shell — there are two

The plan's Layer 2 table says "Staff shell | ... | Serves Admin + Coordinator + Partner" as if
one component serves all three. In code, there are **two separate implementations**:

1. **`/admin`** uses `src/components/admin-shell/AppSidebar.tsx` — built on the shadcn
   `admin-ui/sidebar` primitives, with `NavMain.tsx` (section-grouped nav, matching
   `Sidebar.dc.html`'s "Dashboards / Learning & curriculum / Review & cohorts / System" groupings
   closely — `src/lib/nav.ts`'s `adminNav` already carries matching `section` labels) and a
   **`QuickCreateMenu`** that's already built and already wired in (`New course` / `New WIOA
   board` dialogs). This one is in reasonably good shape against the canvas board.
2. **`/coordinator` and `/partner`** use `src/components/layout/AppShell.tsx` →
   `src/components/layout/Sidebar.tsx` — a hand-built component using the `.sshell-*` classes in
   `design-system.css`, which were never ported from `Sidebar.dc.html` at all (confirmed: that
   board's own classes are `.sb`/`.navuser`/`.qc`/`.rail-ic`/`.sb-banner`, none of which
   `Sidebar.tsx` or `design-system.css`'s `.sshell-*` rules use). This is the one
   `docs/MOCKUP-INDEX.md` flags with the undiagnosed banner/layout-overflow bug.

Checked the `.sshell`/`.sshell-main`/`.sshell-content` CSS and `AppShell.tsx`'s structure
directly: the height-containment chain (`100vh` + `overflow:hidden` on `.sshell`, `overflow-y:auto`
on `.sshell-nav`/`.sshell-content`) is sound on paper. The overflow bug is very likely in a
specific page's content breaking out of `.sshell-content`'s width, not the shell container itself
— but confirming that needs a real browser, which this pass doesn't have (no Playwright per the
plan's standing rules, and no screenshot tool available here). **Still undiagnosed — needs the
user's own browser pass**, now narrowed to "a page's content, not the shell skeleton."

## Confirmed gaps against `Sidebar.dc.html`, both shells

Neither shell has:
- The **Quick Create button styled as the canvas's primary `.btn-qc`** inside the row with an
  Inbox icon button next to it (Admin's `QuickCreateMenu` exists but isn't the two-button row the
  board draws — no Inbox button anywhere).
- **The sidebar promo banner** (`.sb-banner` — photo + gradient + role-specific stat line + CTA).
- An **Inbox entry point** — correctly absent, since it needs Layer 1's `MessageThread` wired into
  real actions/UI, not built yet.

## Why these aren't fixed in this pass

- **Inbox**: blocked on messaging UI (Layer 3, needs Layer 1's `MessageThread`/`Message` actions
  first — schema exists now, nothing reads/writes it yet).
- **Banner card**: the board's banner content is role-specific *and data-driven* ("6 cohorts on
  track this term", "3 cases with no movement in 14+ days", "2 trainees missing documents this
  week") — every one of those numbers comes from a feature this plan hasn't built yet (Cohorts,
  stalled-case detection, document-tracking aggregation). Building the banner *shell* with
  fabricated numbers would violate the plan's own rule 8 ("don't fabricate data to fill a board").
  Revisit once the feature behind each variant's number actually exists.
- **Quick Create for Coordinator/Partner**: Admin's version has two concrete, already-built
  targets (new course, new WIOA board). Nothing in the client scope doc or
  `docs/product/PRODUCT_CONTEXT.md` specifies what a Coordinator or Partner Staff "quick creates"
  — inventing an action here would be fabricating product behavior, not porting a board. **Needs
  a product decision before it's buildable**, not an engineering one.

## Not a gap: Admin's nav structure

`adminNav` in `src/lib/nav.ts` already carries `section` labels matching the canvas almost
word-for-word (`Dashboards`, `Learning & curriculum`, `Review & cohorts`, `System`). Items the
canvas shows that `adminNav` doesn't (Quiz Bank, Cohorts, Announcements, Data Import/Export) are
correctly absent — those routes don't exist yet, so linking to them would be worse than omitting
them. Nothing to fix here; flagged only so a future pass doesn't assume it's broken because the
board shows more items than the nav does.

## Next, if this pass continues

The genuinely safe, buildable item left in Layer 2 without a product decision or missing feature
underneath it is the **Inbox button's absence being correct** (nothing to do) and the **interaction
boards** (`ADM18`–`ADM25`) — several of which the plan itself notes "real equivalents exist...
parity was never checked" (`GlobalSearch`, `NotificationsMenu`, `NavUser`/avatar menu,
`/admin/roles` deactivation). Checking those against their boards is the next concrete,
non-speculative step.
