# NFCAP Brand & Design Tokens

> **STALE — SUPERSEDED.** The color and typography guidance in this file is from the placeholder live site (which had no real branding — see `docs/product/NFCAP_SITE.md`) and predates finding the actual NFCAP logo. **`docs/design/NFCAP_DESIGN_SYSTEM.md` is the current source of truth for color, typography, and component states** — follow that file, not this one, for any design/implementation work. This file is kept only for historical reference (how the placeholder site looked, asset URLs that may or may not still be valid).

Extracted from the live site's rendered HTML/Tailwind classes (view-source, not a design system doc — NFCAP has no published style guide). Source: https://www.nfcap.org/, scraped 2026-09-08.

Assets referenced directly by the site (fetch these to use the real logo/photos in the prototype):

- Logo: `https://www.nfcap.org/logo.png`
- Hero photo: `https://www.nfcap.org/hero.jpg`
- Favicon: `https://www.nfcap.org/favicon.ico`

## Color palette

| Token (suggested name)         | Hex                                                | Used for                                                                             |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `brand-navy` (primary)         | `#163b73`                                          | Header "Apply" button, "Partner with Us" button, Partners section background         |
| `brand-navy-dark`              | `#0f2f5e`                                          | "Contact Us" button (darker navy variant)                                            |
| `brand-navy-deep`              | `#132f63`                                          | Impact metric numbers (100+, 5, 45, 90%)                                             |
| `brand-navy-heading`           | `#173967`                                          | "Train / Certify / Place" step headings                                              |
| `brand-navy-link`              | `#1d457d`                                          | "Impact metrics section—" label text                                                 |
| `brand-navy-hover`             | `#133b72`                                          | Nav link hover color                                                                 |
| `hero-overlay`                 | `#12274a`                                          | Gradient overlay on hero image (used at 35%/10% and 60%/30% opacity)                 |
| `brand-gold` (accent/CTA)      | `#efc44f`                                          | Primary CTA buttons: "Apply for Apprenticeship," "Donate now," "Read Their Stories"  |
| `hero-text-lilac`              | `#d9d5ea`                                          | "Transform futures." span in hero headline (soft lilac-white accent on navy overlay) |
| `page-bg`                      | `#f2f1f4`                                          | Outer page background                                                                |
| `card-bg`                      | `#f8f7f8`                                          | Inner "card" container background, Program/Success Stories section background        |
| Slate scale (Tailwind default) | `slate-900`, `slate-700`, `slate-300`, `slate-200` | Body text, muted text, borders — standard Tailwind slate, not custom                 |
| White                          | `#ffffff`                                          | Header background, card backgrounds                                                  |

**Two-color brand system in practice:** a deep navy/blue (`#163b73` family) as the dominant brand color, paired with a warm gold/mustard (`#efc44f`) as the single accent used exclusively for primary CTAs. This navy+gold pairing is the clearest, most consistent signal on the site and is what "matching NFCAP's brand" should mean in the prototype.

## Typography

- Font family: **Geist** (`geist_a71539c9-module` variable font) for body/UI text, and **Geist Mono** (`geist_mono_8d43a2aa-module`) loaded as a CSS variable but not visibly used in any scraped content — likely reserved for code/mono use, not needed for the LMS UI.
- These are the default fonts Next.js's `create-next-app` scaffolds with (via `next/font/google` or local Geist) — i.e., **the site is using Next.js's out-of-the-box font, not a custom brand typeface**. There's no evidence of an intentional brand font choice.
- Heading sizes observed (arbitrary Tailwind values, for reference): hero H1 `68px` font-black, "Success Stories" H2 `58px` font-black, "Our Partners" H2 `54px` font-black, section H2s `28–34px` font-bold, card headings `24px` font-bold, impact numbers `64px` font-light.
- Letter-spacing: large headings consistently use tight tracking (`-0.03em` to `-0.04em`).

## Shape & elevation

- Border radius: buttons/CTAs use `rounded-md` (6px); cards use `rounded-[14px]`–`rounded-[18px]`; the outer page "frame" uses `rounded-[10px]`.
- Shadows: soft, low-contrast drop shadows on cards (e.g. `shadow-[0_10px_24px_rgba(15,23,42,0.08)]`) and a larger ambient shadow on the outer page frame (`shadow-[0_18px_55px_rgba(15,23,42,0.12)]`) — consistent "soft card on light gray canvas" elevation style, not flat/bordered-only.
- Borders: thin `slate-200`/`slate-300` hairlines throughout, low contrast.

## Practical recommendation for the LMS prototype

Use as CSS/Tailwind theme tokens:

```
--color-brand-primary: #163b73;   /* navy — headers, primary UI chrome, key actions */
--color-brand-primary-dark: #0f2f5e;
--color-brand-accent: #efc44f;    /* gold — primary CTA buttons only, use sparingly */
--color-bg-page: #f2f1f4;
--color-bg-card: #f8f7f8;         /* or #ffffff for higher-contrast cards */
--color-text-heading: #132f63;    /* or slate-900 for body copy */
font-family: Geist, system-ui, sans-serif;
```

Caveat: since the live site itself is an unfinished placeholder (see `docs/product/NFCAP_SITE.md`), these are the _only_ real brand signals that exist — there's no formal brand guideline, logo usage rules, or secondary palette to draw from. Treat this as a reasonable, faithful starting point rather than an authoritative brand spec.
