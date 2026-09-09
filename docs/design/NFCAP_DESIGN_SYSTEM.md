# NFCAP LMS — Design System (Locked)

Supersedes the color/typography sections of `docs/design/NFCAP_DESIGN_TOKENS.md` (that doc was built from the placeholder live site before the real NFCAP logo was found — see caveat at the bottom of this file). Source of the palette/type-scale below: `nfcap_lms_color_typography_system.md` (provided reference), adjusted for accessibility and mapped onto this codebase's existing token names.

Status: **decided and implemented** — tokens, focus ring, and secondary-button hover live in `src/app/globals.css`; Learner Home (`src/app/learner/HomeView.tsx`, `src/components/learner/PathwayCourseCard.tsx`) and the learner header (`src/components/layout/LearnerHeader.tsx`) rebuilt against the reference mockup (`ChatGPT Image Sep 9, 2026, 04_10_18 PM.png`). No raw hex values remain outside `globals.css`.

## Scope decisions

- Dark mode: explicitly **out of scope** for now.
- Font family: **no change** — keep Geist Sans (current app font). The reference doc's Inter recommendation was considered and rejected; Geist and Inter are close enough that switching wasn't worth the churn.
- Token naming: hex values below are mapped onto the **existing semantic token names** already used in `src/app/globals.css` (e.g. `--color-brand-primary`, `--color-status-*`), not the reference doc's brand-literal names (`--nfcap-red`, `--deep-navy`). Keeps the diff small and avoids hunting down usages if brand colors ever change again.

## Brand direction

Navy = structure (headings, hero, nav emphasis). Red = action (primary CTA, active/progress indicators). Charcoal = body text readability. White/light-gray = clean canvas. Red is used sparingly — target usage ratio:

| Color family | Approx. usage |
|---|---:|
| White / light gray | 60% |
| Navy / charcoal | 25% |
| Slate / supporting neutrals | 10% |
| NFCAP red | 5% |

Validated against the provided homepage mockup (`ChatGPT Image Sep 9, 2026, 04_10_18 PM.png`) — red appears only in the CTA button, "Next up"/"Continue learning" badges, the active step's border, and progress indicators. Matches the ratio in practice.

## Color tokens

Mapped onto existing `src/app/globals.css` token names.

| Existing token | New value | Was | Notes |
|---|---|---|---|
| `--color-brand-primary` | `#123557` | `#163b73` | Deep navy |
| `--color-brand-primary-dark` | `#0D2942` | `#0f2f5e` | Navy dark — strong headings, dark surfaces |
| `--color-brand-primary-hover` | `#315678` | `#133b72` | Navy soft — reused for secondary text/icons too |
| `--color-brand-heading` | `#123557` | `#132f63` | Same as primary |
| `--color-brand-accent` | `#D71920` | `#efc44f` | NFCAP red — primary CTA, active states, progress |
| `--color-brand-accent-hover` | `#B51218` | `#e0b33b` | Red dark — hover/pressed |
| `--color-bg-page` | `#F6F7F9` | `#f2f1f4` | |
| `--color-bg-card` | `#FFFFFF` | `#ffffff` | unchanged |
| `--color-bg-subtle` | `#EEF1F4` | `#f8f7f8` | "muted" — disabled/locked backgrounds |
| `--color-text-primary` | `#1F2D3A` | `#0f172a` | Charcoal |
| `--color-text-secondary` | `#64778A` | `#475569` | Slate |
| `--color-text-muted` | `#315678` | `#94a3b8` | **Fixed from reference doc** — see Accessibility fixes below |
| `--color-border-subtle` | `#EEF1F4` | `#e2e8f0` | |
| `--color-border-default` | `#DCE2E8` | `#cbd5e1` | |

New supporting tints (add as new tokens, not in current file):

| Token | Value | Usage |
|---|---|---|
| `--color-accent-tint` | `#FCECEE` | Active course card background |
| `--color-accent-tint-text` | `#9E1015` | **New — not in reference doc.** Text-on-tint use only (e.g. "Next up" label). See fix below. |
| `--color-brand-tint` | `#EDF3F8` | Selected/informational navy backgrounds, secondary-button hover fill |

Status tokens (map onto existing `--color-status-*` structure):

| Token | Value |
|---|---|
| `--color-status-success-text` | `#21855B` |
| `--color-status-pending-text` (warning) | `#B7791F` |
| `--color-status-danger-text` / `--color-danger` | `#D71920` |
| `--color-status-info-text` | `#315678` |

## Accessibility fixes applied to the reference doc

The reference doc (`nfcap_lms_color_typography_system.md`) had two contrast issues, resolved here — both computed against WCAG AA (4.5:1 normal text):

1. **Locked-state text.** Reference specified `#8A98A6` on `#EEF1F4` → **~2.55:1, fails AA.** Fixed by reusing the doc's own `navy-soft` (`#315678`) for this text instead — **6.78:1**, passes comfortably, and reuses an already-defined token rather than adding a new gray.
2. **"Next up" badge text.** Reference specified `red-dark` (`#B51218`) on `red-tint` (`#FCECEE`) at 12px/600 → **~4.5:1, borderline** (12px bold doesn't qualify for the WCAG large-text exception). Fixed by adding a dedicated darker value for text-on-tint use only: `#9E1015` → **~7.2:1**. Button hover keeps `#B51218` unchanged (that pairing, white-on-red, is fine).

## Gaps the reference doc didn't cover — resolved here

- **Focus ring** (not specified in reference doc, required by accessibility checklist): dual-tone ring — 2px white inner ring + 2px `navy-dark` (`#0D2942`) outer ring, via `outline` + `box-shadow`. Verified >12:1 contrast against both white and navy surfaces, so it stays visible everywhere in the app (light cards, navy hero band) without conditional per-surface styling.
- **Secondary/navy button hover** (only a static text color was specified): on hover, apply `--color-brand-tint` (`#EDF3F8`) as a background fill, text shifts to `--color-brand-primary-dark`. Reuses an existing token rather than inventing a new one.

## Typography

Unchanged from current app: **Geist Sans** for all UI/body/headings, **Geist Mono** reserved (unused in UI). Type scale (sizes/weights/line-heights) follows the reference doc's scale — see `nfcap_lms_color_typography_system.md` §5 for the full table (H1 40px/700, H2 28px/700, course title 20px/700, body 15–16px/400, metadata 14px/500, etc.) — no changes needed to those values, only the font-family stays Geist instead of the doc's Inter suggestion.

## Component state rules (from reference doc, unchanged)

- **Active/next-up course:** border `--color-brand-accent`, background `--color-accent-tint`, accent `--color-brand-accent`.
- **Available/not started:** background `--color-brand-tint`, text `--color-brand-primary-hover` (navy-soft).
- **Locked:** background `--color-bg-subtle`, text `--color-brand-primary-hover` (navy-soft, per fix above), border `--color-border-default`. No red or navy-heavy treatment.
- **Completed:** text `--color-status-success-text` only — green is not a general brand color.

## Open follow-ups (not blocking implementation)

- Verify real-world red usage stays near the 5% target once more pages are built (flagged as a thing to eyeball, not a fixed rule).
- `docs/design/NFCAP_DESIGN_TOKENS.md` should be marked superseded for its color/typography sections once this is implemented — its logo/asset URLs (`nfcap.org/logo.png`, `/hero.jpg`) may also be stale; the actual logo now in use is `public/nfcap-logo.png`, sourced from the user directly, not scraped.
