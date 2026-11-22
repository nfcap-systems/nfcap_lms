# Admin UI Revamp — Backlog

Branch: `feature/phase-0-quality-foundations`. Captured 2026-11-17 after the first full pass
(shell + Quick Create + Dashboard + data-tables + all remaining admin pages converted to the
shadcn/`radix-nova` foundation — see chat history / commit log for the full build). Everything
typechecks and lints clean. This doc is the punch list for the next session: visual/polish gaps
found by comparing our build against the live template reference
(studio-admin.arhamkhnz.com), not functional bugs.

## Open items

1. **Sidebar brand header doesn't match the template's lockup.** Template: plain icon + wordmark,
   no background box. Ours: boxed black "N" square + "NFCAP LMS" — extra chrome the template
   doesn't have. (`src/components/admin-shell/AppSidebar.tsx`)

2. **Quick Create doesn't render as a distinct CTA pill.** In the template it's a bold, clearly
   separated dark button with a circular "+" icon, paired with an adjacent small icon button. In
   our build it renders as just another sidebar nav row — the `bg-primary` styling isn't visually
   standing out the way the template's does. Needs investigation into `SidebarMenuButton` sizing/
   padding for this specific button, possibly a dedicated style override rather than reusing the
   generic nav-item classes. (`src/components/admin-shell/quick-create/QuickCreateMenu.tsx`)

3. **No section grouping in the sidebar nav.** Template groups items under a label ("Dashboards")
   with more generous vertical spacing. Ours is a flat, denser list. `adminNav` in `src/lib/nav.ts`
   has no group-label concept at the top level (only nested WIOA children) — decide whether to add
   one, or whether this is just a spacing/density fix in `NavMain.tsx`.

4. **Header icon buttons (search/notifications) don't match the template's style.** These are
   deliberately still the real `GlobalSearch`/`NotificationsMenu` components (kept as-is per plan —
   real logic, not reused). But their trigger buttons still carry their OLD hand-rolled styling
   (light circular pill), not the template's bordered square icon-button look. Needs a pass to
   reskin just the trigger button markup with `admin-ui` `Button` (`variant="outline" size="icon"`)
   without touching the underlying search/notification logic. (`src/components/layout/GlobalSearch.tsx`,
   `src/components/layout/NotificationsMenu.tsx`, or wrap at the `AdminHeader.tsx` call site instead
   of editing the shared components directly.)

5. **Typography doesn't visually match the template.** Flagged directly by the user — overall font
   rendering (not just one heading) looks off vs. the template. To investigate: confirm Geist is
   actually cascading into `admin-ui` components (the new `@theme inline` block in `globals.css`
   doesn't itself redefine `--font-sans`, so it should inherit the original `@theme` block's
   `--font-sans: var(--font-geist-sans)...` — verify this is actually true in the rendered DOM, not
   just assumed). Also compare heading/label type scale and weights against the template's actual
   values (e.g. page titles, nav item text, KPI numbers).

6. **Evidence Status by Course chart bars render as solid full-bleed blocks.** No gap between bars,
   no rounded corners, no legend — just blocky red/green rectangles touching each other. Template's
   `assignment-status.tsx` reference has `barGap`, `radius`, a dotted fill pattern, and a
   `ChartLegend`. Needs a real polish pass on `EvidenceStatusChart` in
   `src/app/admin/DashboardView.tsx`.

7. **Performance Highlights avatar-stack rendering is broken.** The top-scorer initials ("PS DA")
   are rendering merged/overlapping into a single dark pill instead of distinct spaced circular
   avatars on the bar. The custom `PerformanceHighlightBar` SVG shape's avatar-position math needs
   debugging — likely the per-student `index * 14` offset isn't accounting for circle radius/spacing
   correctly at this bar height. (`src/app/admin/DashboardView.tsx`)

8. **General spacing/density feels tighter than the template throughout.** Worth a broader pass
   comparing `gap-*`/padding values used across the new pages against the template's actual spacing
   scale, once the above specific items are fixed — this one may partly resolve itself once #3 and
   #6/#7 are fixed.

## Not in scope for this backlog (already known, deliberate)

- `WioaReportsView` and `AccountSettingsForm` are shared across admin/coordinator/partner/learner —
  left on the old design on purpose; only their page headers got the new look.
- Visual verification in a real browser as admin hasn't been done yet this session (seed-admin
  action was never approved) — these findings are from the user's own screenshots, not my own
  browser pass. Worth doing a full click-through once the above items are fixed.
