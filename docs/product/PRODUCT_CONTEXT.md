# NFCAP LMS — Product Context

This is the working product context for the NFCAP LMS prototype. It combines the original product direction with decisions made through design discussion. It should be treated as the current source of truth — update it as decisions change.

Related docs:

- `docs/product/NFCAP_SITE.md` — factual findings from NFCAP's real website
- `docs/design/NFCAP_DESIGN_TOKENS.md` — brand colors/typography extracted from the real site
- `docs/wioa/WIOA_Eligibility_Matching_App_Developer_Specification.pdf` — source spec for the WIOA funding module (Section 16)
- `docs/wioa/WIOA_INTEGRATION_PLAN.md` — full integration plan, data model, and deferred-items tracking for the WIOA funding module

---

## 1. What We Are Building

- **NFCAP** — the real-world training and apprenticeship organization, focused on flooring careers.
- **NFCAP LMS** — the software platform we are building for NFCAP.
- **This repo** — a **prototype** of that LMS: Next.js, Supabase (Postgres + Auth) via Prisma (see Section 13). The goal is to validate product concept, UX, information architecture, and learning/admin workflows before investing in production-grade infrastructure (file storage, multi-tenant scoping, etc.).

NFCAP's real-world operating model is **Train → Certify → Place** (confirmed from their site). This LMS prototype covers **Train and Certify only** — see Section 4 (Positioning) and Section 8 (Scope Decisions) for why Place is explicitly excluded.

---

## 2. Product Goal

**For learners (apprentices),** the platform should make it easy to:

- Discover available training
- Work through structured lessons (video, text, images, resources)
- Complete knowledge assessments
- Submit evidence of practical/hands-on work
- Track progress and know what's next
- Build a portfolio of demonstrated skills
- Earn credentials as they progress through the program

**For NFCAP Admin/staff,** the platform should make it easy to:

- Build and manage the multi-course apprenticeship program
- Create sections, lessons, and assessments within each course
- Manage learners and monitor their progress
- Review and verify submitted practical evidence
- Issue credentials/certificates upon verified completion

---

## 3. The Product Is NOT

- A generic SaaS dashboard
- A generic course marketplace (Coursera/Udemy-style shopping experience)
- A social network
- A complicated enterprise LMS

Coursera/Udemy can be referenced for individual UX patterns (e.g., video player, lesson navigation) but the product's overall feel and positioning must not read as a course marketplace.

---

## 4. Core Product Positioning

NFCAP LMS is **not primarily a course marketplace**. It is a structured learning and career-development environment where learners:

- work through training in NFCAP's apprenticeship program
- develop knowledge and practical skills
- complete learning and knowledge assessments
- demonstrate competency through practical evidence
- build evidence of their development (Portfolio)
- earn credentials as they progress

When making UX/IA decisions, the guiding question is:

> **"What does this learner need to do next in their NFCAP training?"**
> not:
> "What course does this learner want to browse or purchase?"

---

## 5. Core Learning Model (Canonical Flow)

The apprenticeship program is modeled as **multiple courses** forming one structured pathway (e.g., Safety & Tools → Flooring Fundamentals → Tile Installation → Professionalism), not a single monolithic course. This is what allows learners to "earn credentials as they progress" rather than only at the very end.

```
Course
  ↓
Sections
  ↓
Lessons (video / text / images / resources) — manually marked complete by the learner
  ↓
Knowledge Assessment (quiz)
  ↓
Practical Evidence (learner submits proof of real-world/hands-on work)
  ↓
Verification (Admin reviews and approves the evidence)
  ↓
Course / Competency Completion
  ↓
Credential
```

**Key principle: course completion ≠ competency.** Finishing lessons and passing a knowledge quiz is not sufficient. A course is only fully complete once the learner has submitted Practical Evidence and Admin has verified it. This reflects NFCAP's real apprenticeship context — physical trade skills (tile-setting, installation technique) cannot be tested inside the app; the app's role is to **capture evidence of real-world work and support its review**, not to simulate or test the physical skill itself.

**Lesson completion rule:** a lesson is marked complete when the learner manually clicks "Mark as Complete" — not automatically inferred from video watch-time or scroll position. Chosen for prototype simplicity and to give the learner an explicit, deliberate progress action.

---

## 6. Primary Users

Two roles for the prototype:

### Learner (Apprentice)

Prioritize: clarity, progress visibility, motivation, learning continuity, always knowing what's next and what's been achieved.

### Admin (single NFCAP staff role)

Handles all administrative responsibilities — course/curriculum authoring, learner management, and evidence verification are **not split into separate sub-roles** for this prototype (no distinct "reviewer" or "coordinator" role). Nothing in the product's scope currently requires the split.

**No employer/mentor role.** No third-party (employer, job-site mentor) has any access to the LMS in this prototype — see Section 8.

---

## 7. Learning Content

A lesson may include: video, text/content, images, documents/resources, practical instructions, and an optional assessment. Admin manages all of this content within the Curriculum Builder.

Videos use mock/sample sources for the prototype — no real video storage or streaming infrastructure needed.

---

## 8. Explicit Scope Decisions (from design discussion)

These are resolved decisions, not assumptions — kept explicit so they aren't silently re-litigated later.

| Decision                              | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Program structure**                 | The apprenticeship is a **program made of multiple courses**, not one monolithic course. Each course can independently yield a credential.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Curriculum Builder scope**          | **Curriculum Builder is scoped to a single course**: it manages Course → Sections → Lessons → Content → Assessments. It replaces the separate "Create/Edit Course" concept — there is one per-course authoring tool, not two. A **Program/Pathway Builder** (managing the program's course order/sequence at the apprenticeship level) is a **future capability, explicitly out of scope for this prototype** — no UI, no CRUD, no implementation time spent on it now. Admin navigation and data structures should stay conceptually extensible for it later (e.g. don't hardcode course ordering in a way that would block introducing a program-level sequencing concept), but nothing program-level should be built now. |
| **Discovery (Explore)**               | **Explore** exists as the learner's discovery experience — a browsable library of NFCAP's available training. It must not feel like a commercial course marketplace (no shopping-cart/price-tag visual patterns).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **My Learning vs. Explore**           | **Explore** = full training library (what exists). **My Learning** = what the learner is currently enrolled in or has been assigned (what's theirs, active).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Enrollment/assignment rule**        | **Deferred.** Not every course in Explore is freely self-enrollable — enrollment/assignment eligibility is a **per-course property** (open vs. restricted), not a single global rule. The exact rule for which courses are open vs. restricted, and the real assignment mechanism, is deferred — for the prototype, mock data can simply pre-seed which courses are open/restricted and which are already in a learner's My Learning.                                                                                                                                                                                                                                                                                        |
| **Competency verification mechanism** | Not a live in-app test. It's an **evidence submission + Admin review** workflow (see Section 5's canonical flow).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Trigger for evidence submission**   | **Deferred.** Whether Practical Evidence submission is tied to a specific course step or freely added by the learner is not yet decided; doesn't block building the submission/review screens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Portfolio audience**                | Visible only to the **owning learner and Admin** (for verification). No employer-facing, public, or external access in this prototype. Architecture should stay conceptually compatible with **future** sharing/export, but sharing/export itself is explicitly **out of scope now** — do not design or build it.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Placement ("Place")**               | **Out of scope entirely.** The LMS stops at certification. No placement status, no employer-matching, no employer-facing concept anywhere in the product.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Employer/mentor role**              | **Not needed** — follows directly from Placement being out of scope and Admin being the sole verifier of evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Apprenticeship hour tracking**      | **Out of scope** for the prototype. The prototype does not model RTI/OJT hour requirements. This can be introduced later if required by NFCAP's real operational model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Admin roles**                       | **Single Admin role** for the prototype. No split between course-author, reviewer, and learner-manager responsibilities.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Lesson completion rule**            | Manual "Mark as Complete" click — not automatic on video-watch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

---

## 9. Information Architecture (current, not final)

### Learner

- Home
- Explore (training library — browsable, not a marketplace)
- My Learning (enrolled/assigned training, in progress)
- Course/Learning Screen (lessons, assessments, evidence submission)
- Portfolio (verified evidence, learner + Admin visible only)
- Certificates
- Profile

### Admin

- Dashboard
- Courses (list/manage)
- Curriculum Builder (per-course: sections, lessons, content, assessments)
- Learners (roster + progress visibility)
- Learner Profile (individual progress, evidence review/verification)
- Analytics (future/simple)
- Settings (future)
- Pathway (own nav entry) — `/admin/pathway` lists the (one) pathway as a summary card (course
  count, total learners, completion rate); opening it (`/admin/pathway/apprenticeship`) shows the
  same stats plus a drag-to-reorder list of all courses and a per-course Open/Restricted toggle
  (Restricted = locked until the previous course in the pathway is completed). Reuses the existing
  `pathwayOrder`/`access` fields and lock logic already in `PathwayCourseCard.tsx` — no schema
  change. Linear, single pathway only (no branching/conditional paths, no multiple parallel
  programs — see Section 15).

This structure may change through design exploration — discuss before changing it materially.

---

## 10. Core Product Flow

```
Explore → (Enroll/Assigned) → My Learning → Lessons → Knowledge Assessment
  → Practical Evidence → Verification → Course Completion → Credential
  → Portfolio (accumulates verified evidence) → Certificates
```

Placement is explicitly not part of this flow (Section 8).

---

## 11. Design Direction

The product should feel: professional, modern, trustworthy, structured, approachable, practical — appropriate for workforce/apprenticeship education. It should communicate that the learner is building a real career, not just completing online courses.

**Avoid:** excessive cards, generic dashboard patterns, decorative UI/gradients, unnecessary navigation/tabs, dense enterprise interfaces, turning every piece of information into a separate card. Marketplace-style visual patterns (shopping grids, price-tag aesthetics) should specifically be avoided in Explore.

**Prioritize:** strong hierarchy, clear navigation, clear CTAs, progressive disclosure, strong progress visibility, consistent interaction patterns, good responsive behavior. Every element should have a purpose.

Brand reference (from NFCAP's real site — see `docs/design/NFCAP_DESIGN_TOKENS.md`): navy (`#163b73`) as primary, gold (`#efc44f`) as a sparingly-used accent for primary CTAs.

---

## 12. Prototype Philosophy

This is a prototype, not a production system — but as of 2026-09-09 it runs on a real Supabase (Postgres + Auth) backend rather than mock/local data (see Section 13). "Prototype" here means: don't build backend complexity a production system would eventually need beyond what's already in place — no multi-tenant scoping, no role split beyond Learner/Admin, no file storage yet, no attempt history UI beyond what the schema already captures. Build only what's needed to convincingly demonstrate the experience; simulate what genuinely doesn't need to be real yet (e.g. Practical Evidence file uploads are still filename-only).

---

## 13. Technical Philosophy

Current foundation: Next.js, React, TypeScript, App Router, ESLint, Prettier, Git, Supabase (Postgres + Auth) via Prisma. As of 2026-09-09 the prototype moved off mock-data/localStorage onto this real backend — courses, curriculum, enrollment, progress, quiz attempts, evidence, and certificates are all persisted in Postgres, and learners/Admin sign in with real Supabase Auth accounts (2 roles: `LEARNER`/`ADMIN`). Practical Evidence file uploads remain filename-only for now (no Supabase Storage integration yet) — that's the one piece still intentionally mocked.

---

## 14. How We Work Together

The user is the product designer and makes final product/UX/design decisions. This document reflects decisions reached through discussion — new product decisions should follow the same pattern: understand the problem → consider UX implications → present alternatives when meaningful → recommend → wait for decision on anything that materially affects the product → implement.

Do not silently make major product decisions or expand scope without discussing it first. Build incrementally, one experience/workflow at a time.

---

## 15. Still Open / Not Yet Decided

- Exact rule for which courses are open (self-enroll) vs. restricted (assigned) — deferred, mock data can approximate.
- Real assignment mechanism (if/when it's needed) — deferred, no cohort/assignment engine planned for prototype.
- Whether Practical Evidence submission is tied to a specific course step or freely added to Portfolio.
- Whether NFCAP has any optional/supplementary courses beyond the core apprenticeship pathway (unconfirmed — affects whether Explore ever shows non-core content).
- Whether NFCAP ever needs more than one pathway (e.g. per state or per trade) — `docs/product/NFCAP_SITE.md`'s "5 states operating in" stat is the only hint, and it's explicitly unconfirmed there too. Single-pathway model stands until this is confirmed; not building multi-pathway speculatively.

---

## 16. WIOA Funding Module (Planned Addition, Not Yet Implemented)

NFCAP is a federally recognized apprenticeship program, which makes it the kind of program **WIOA** (Workforce Innovation and Opportunity Act) funding targets — a federal program administered through **local workforce boards**, not the federal government directly. A learner can potentially get WIOA to pay for NFCAP training instead of self-paying.

This is planned as a **parallel, independent module** attached to the existing learner, not a rework of Section 5's Core Learning Model. Full detail, data model, and deferred-items tracking live in `docs/wioa/WIOA_INTEGRATION_PLAN.md`; this section is the pointer + the decisions that matter for the rest of this document.

**What the module does**: matches a student to their correct local workforce board/AJCC/contact by address, helps them start outreach (email/call/view requirements) from inside the app, tracks their progress through that external process (documents, eligibility, funding) for staff visibility, and gates WIOA-funded course access on funding approval. **There is no system-to-system integration with any government system** (no CalJOBS API) — the connection to the workforce board is human (email/phone), tracked manually by staff.

**Relationship to existing scope decisions (Section 8)**: WIOA funding is not Placement — it's funding access, not job-matching — and does not introduce an employer/mentor role. It introduces a narrow new external-facing concept (workforce board contact) scoped only to the funding pipeline. It does not reopen or contradict the Placement/employer-role exclusion.

**Two learner flows**:

- **Self-pay** (existing, unchanged): Sign up → Explore (open course) → Enroll → Lessons → Assessment → Evidence → Verification → Credential → Portfolio → Certificates.
- **WIOA-funded** (new): Sign up → Explore (restricted course) → WIOA process (match → outreach → documents → eligibility → ETPL funding → tuition approval) → Enroll unlocks → same learning flow as above.

**Gating decision**: WIOA funding is one way a course's existing (already-deferred, see Section 15) `open` vs. `restricted` property gets satisfied — not a new WIOA-specific check bolted onto Enrollment. Enrollment logic only ever asks "is this course open, or restricted-and-satisfied" and has no knowledge of _what_ satisfies a restriction. This keeps the two systems decoupled.

**New roles**: `PARTNER_STAFF` (scoped to their assigned students) and `WIOA_COORDINATOR` (sees all cases, funding, communications) — both new, added alongside the existing Learner/Admin roles, not replacing the "single Admin role" decision in Section 8 (Admin itself stays unsplit; these are additional roles for the new module).

**Status**: planning complete, nothing implemented. See `docs/wioa/WIOA_INTEGRATION_PLAN.md` for the full data model, phased build order (Match → Documents/Case → Dashboards → Funding+Gating), what's real vs. mocked for the prototype, and the full list of deliberately deferred items (multi-org architecture, automation/follow-up rules, full production security hardening, etc.).
