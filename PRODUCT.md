# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Learner (Apprentice)** — primary user of the surface currently being redesigned. In active flooring-trade apprenticeship training via NFCAP. Needs clarity, progress visibility, motivation, and continuity: always knowing what's next and what's already been achieved, on desktop and mobile, often between/after physical work shifts.

**Admin (single NFCAP staff role)** — secondary user, not in scope for this task. Handles curriculum authoring, learner management, and evidence verification; not split into sub-roles.

## Product Purpose

NFCAP LMS is the training and certification platform for NFCAP's real-world flooring apprenticeship program (Train → Certify → Place; this prototype covers Train + Certify only). Learners work through a structured multi-course pathway — lessons, knowledge assessments, and practical evidence submission — to earn credentials as they progress, building toward a real trade career, not just completing online courses.

## Positioning

Not a generic SaaS dashboard, not a course marketplace (Coursera/Udemy-style shopping experience), not a social network, not a complicated enterprise LMS. It is a structured learning and career-development environment for a specific apprenticeship program. The guiding question for every learner-facing decision: "What does this learner need to do next in their NFCAP training?" — never "what course does this learner want to browse or buy?"

## Operating Context

Canonical flow: Course → Sections → Lessons (video/text/images/resources, manually marked complete) → Knowledge Assessment → Practical Evidence submission → Admin Verification → Course/Competency Completion → Credential. Course completion requires verified practical evidence, not just lesson/quiz completion, reflecting that physical trade skill can't be tested in-app. Learner IA: Home, Explore (discovery library), My Learning (enrolled/assigned), Course/Learning screen, Portfolio (verified evidence), Certificates, Profile.

## Capabilities and Constraints

Prototype only: Next.js/React/TypeScript/App Router, mock/local data, no real backend, DB, or auth work in scope. Existing component library (`@/components/ui`, `@/components/learner`) and progress store (`@/lib/progress-store`) are the current implementation surface. This task is scoped to the Learner Home experience's visual direction only — do not touch Admin, backend, or other learner routes' underlying logic (routing/data may be reused, presentation is what's changing).

## Brand Commitments

Name: NFCAP LMS. Brand palette confirmed from NFCAP's real site (`docs/design/NFCAP_DESIGN_TOKENS.md`): navy `#163b73` family as dominant/primary, gold `#efc44f` as a sparingly-used accent reserved for primary CTAs. Geist as the current UI typeface (no confirmed custom brand typeface — open to reconsideration for the redesign since it's the Next.js default, not an intentional choice). No logo/photo assets are wired into the prototype yet.

## Evidence on Hand

Mock course/lesson/progress data in `@/lib/mock-data`. No real learner photos, testimonials, or NFCAP marketing assets are integrated. `docs/product/NFCAP_SITE.md` and `docs/design/NFCAP_DESIGN_TOKENS.md` document the real (unfinished/placeholder) marketing site — reference only, not a source of production assets.

## Product Principles

- Task-first, not stats-first: always answer "what's next" before showing progress metrics.
- Never read as a course marketplace: no ratings, prices, cart, subscriptions, or promotional banners anywhere in the learner experience.
- Every element must earn its place — avoid decorative cards, dense enterprise chrome, and turning every fact into its own bordered box.
- Feels like a professional training platform building toward a real trade career, not a SaaS analytics dashboard or a content-shopping site.
- Build incrementally, one experience at a time; this task is Home only.

## Accessibility & Inclusion

No product-specific requirement established beyond standard web accessibility (semantic structure, keyboard/focus support, sufficient contrast) — maintain existing baseline.
