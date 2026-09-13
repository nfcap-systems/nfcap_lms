# NFCAP LMS — Build Workflow

Practical, phase-wise build plan for this prototype. Companion to `docs/product/PRODUCT_CONTEXT.md`
(source of truth for product decisions — this doc is sequencing/scope for implementation only).

Working mode per phase: **DECIDE → BUILD → REVIEW → REFINE**. Flag genuinely open/ambiguous
UX questions briefly; otherwise make a reasonable prototype assumption and continue. Do not
reopen decisions already settled in `docs/product/PRODUCT_CONTEXT.md`.

Frontend-only prototype originally: mock/local data throughout, no backend. **Superseded
2026-09-09** — the app now runs on Supabase (Postgres + Auth) via Prisma; see
`docs/product/PRODUCT_CONTEXT.md` Section 13 and the phase log this note replaces. The phases below
describe the original mock-data UI build and are kept as historical record of what shipped when.

Status legend: ✅ done · 🔲 not started

---

## Phase 0 — UI Foundation & App Shell ✅ DONE

**Goal:** Shared foundation everything else builds on. No feature-specific UX designed here.

**Built:**

- Tailwind CSS v4 + brand tokens in `src/app/globals.css`, mapped from `docs/design/NFCAP_DESIGN_TOKENS.md`
  (navy `#163b73` / gold `#efc44f`, page/card surfaces, Geist fonts). Status colors
  (success/pending/restricted/info/danger) are original additions — not in the brand doc.
- UI kit — `src/components/ui/`: `Button`, `Badge`, `Card` (+Header/Title/Description/Content/Footer),
  `ProgressBar`, form controls (`Input`, `Textarea`, `Select`, `Checkbox`, `Field`), `Dialog`, `Drawer`.
- App shell — `src/components/layout/`: `Sidebar` (desktop + mobile drawer, active-state highlighting,
  role switcher), `Header` (auto page title), `AppShell`.
- Nav config — `src/lib/nav.ts` (`learnerNav`, `adminNav`). Deliberately **no** Program/Pathway
  Builder entry (see Phase 3 note below).
- Icon set — `src/components/icons.tsx` (inline SVG, no external icon package).
- Route skeleton — every screen in `docs/product/PRODUCT_CONTEXT.md` Section 9 exists and is reachable via
  nav, rendering `PlaceholderScreen` (title + description + owning phase) except the shell itself:
  - Learner: `/learner`, `/learner/explore`, `/learner/my-learning`, `/learner/courses/[courseId]`,
    `/learner/portfolio`, `/learner/certificates`, `/learner/profile`
  - Admin: `/admin`, `/admin/courses`, `/admin/courses/[courseId]` (Curriculum Builder),
    `/admin/learners`, `/admin/learners/[learnerId]`, `/admin/analytics`, `/admin/settings`
  - `/` redirects to `/learner`

**Verified:** `tsc --noEmit`, `npm run lint`, `npm run build` all pass; all 15 routes generate.

**Assumption made without re-asking:** Tailwind CSS v4 as the styling approach.

**Not built (by design):** any real feature UX — Explore, My Learning, Curriculum Builder content,
Portfolio, Certificates, Admin Reviews, etc. All still placeholders.

---

## Phase 1 — Learner Core Experience ✅ DONE

**Goal:** Validate the primary learner journey: discover → enroll → learn.

**Built:**

- Home (`/learner`) — "Continue Learning" CTA for the next incomplete lesson, recent-progress
  cards, quick links.
- Explore (`/learner/explore`) — course grid, category + open/restricted badges (icon + text,
  no shopping-cart/price-tag patterns), Enroll action on open courses.
- My Learning (`/learner/my-learning`) — enrolled courses with progress bars and status badges,
  empty state pointing to Explore.
- Course/Learning screen (`/learner/courses/[courseId]`) — Sections → Lessons sidebar, lesson
  content rendering per type (video/text/image/resource), Previous/Next lesson navigation,
  manual "Mark as Complete", enroll and restricted-lock states for non-enrolled courses.
- Mock data (`src/lib/mock-data.ts`, `src/lib/types.ts`): 4 courses forming one pathway
  (Safety & Tools → Flooring Fundamentals → Tile Installation → Professionalism), first two
  open, last two restricted (prototype assumption — real rule still deferred per Section 15).
- Client-side progress store (`src/lib/progress-store.tsx`) — enrollment + completed-lesson
  state via `useSyncExternalStore`, persisted to `localStorage`. No backend.
- New shared components under `src/components/learner/` (course cards, lesson sidebar, lesson
  content renderer) and additional icons in `src/components/icons.tsx`.

**Key flow validated:** Explore → Enroll/Assigned → My Learning → Lessons → lesson completion
(../product/PRODUCT_CONTEXT.md Section 10, up through lesson completion).

**Depends on:** Phase 0 shell/nav.

**Verified:** `tsc --noEmit`, `npm run lint`, `npm run build` all pass clean; all 15 routes
generate; user reviewed the built screens and approved.

**Explicitly NOT built yet:** Knowledge assessments, practical evidence submission, verification,
credentials, portfolio, certificates, any Admin screen content.

**Completion criteria:** A mock learner can browse Explore, land in My Learning, open a course,
move through sections/lessons, and mark lessons complete, with progress visibly reflected.

---

## Phase 2 — Knowledge Assessment & Practical Evidence ✅ DONE

**Goal:** Validate "course completion ≠ competency."

**Built:**

- Knowledge Assessment (quiz) UI (`src/components/learner/QuizView.tsx`) — multiple-choice
  questions, mock scoring against a per-course pass threshold, pass/fail results with
  correct/incorrect answer review, retake flow.
- Practical Evidence submission UI (`src/components/learner/EvidenceView.tsx`) — description +
  optional mock file attachment (filename captured client-side only, no real upload/storage).
- Pending-verification status shown to the learner once evidence is submitted (`pending` /
  `approved` / `rejected` status model, only `pending` reachable until Phase 3 adds Admin review).
- Course/Learning screen (`CourseLearningView.tsx`) extended with two additional steps appended
  to the lesson sidebar (`LessonSidebar.tsx`, "Competency" group): Knowledge Assessment (locked
  until all lessons complete) → Practical Evidence (locked until the assessment is passed).
- Data: `Assessment`/`QuizQuestion` types and per-course `assessment` + `evidencePrompt` added to
  `src/lib/types.ts` and `src/lib/mock-data.ts` (all 4 courses). `quizAttempt` / `evidence` fields
  added to `src/lib/progress-store.tsx` (`recordQuizAttempt`, `submitEvidence`, `getQuizAttempt`,
  `getEvidence`), persisted the same way as lesson completion (localStorage, no backend).

**Key flow validated:** Lessons → Knowledge Assessment → Practical Evidence submission
(learner-facing half of Section 5's canonical flow).

**Depends on:** Phase 1 (course/lesson structure must exist).

**Prototype assumptions made (not re-litigated, consistent with Section 15's deferrals):**

- One assessment and one evidence submission per course (not per section/lesson) — matches
  Section 5's canonical flow, which places both after all lessons.
- Pass threshold 75%, 4 questions per course quiz — arbitrary reasonable prototype values.
- Evidence "attachment" only captures the selected file's name client-side; no real file storage.

**Explicitly NOT built yet:** Admin-side review/verification UI, credential issuance, Portfolio,
Certificates.

**Verified:** `tsc --noEmit`, `npm run lint`, `npm run build` all pass clean; all 15 routes
generate; user walked the full flow (lessons → assessment → evidence → pending verification) on
`safety-tools` in the browser and approved.

**Completion criteria:** A learner can complete a quiz (mock pass/fail), submit evidence for a
course step, and see a clear "awaiting verification" status.

---

## Phase 3 — Admin Workflows ✅ DONE

**Goal:** Validate authoring and management.

**Built:**

- Admin Dashboard (`/admin`) — stat tiles (Learners, Courses, Pending Reviews) and a "Needs
  Review" list of every learner's pending Practical Evidence submission, linking into their
  Learner Profile.
- Courses list (`/admin/courses`) — card grid of all 4 courses with section/lesson counts and
  an entry point into each course's Curriculum Builder.
- **Curriculum Builder** (`/admin/courses/[courseId]`, `src/components/admin/CurriculumBuilderView.tsx`)
  — scoped to a **single course**: shows its Sections → Lessons and Knowledge Assessment
  questions, with working "Add Section" / "Add Lesson" / "Add Question" dialogs
  (`src/lib/curriculum-store.tsx`, localStorage-persisted, `useSyncExternalStore`). Additions are
  merged into what the learner sees on the Course/Learning screen too (`CourseLearningView.tsx`
  calls the same `mergeCurriculum` helper) — both sides share this browser's localStorage, so no
  real backend was needed to make authoring visible end-to-end.
- Learners roster (`/admin/learners`) + Learner Profile (`/admin/learners/[learnerId]`,
  `src/components/admin/LearnerProfileView.tsx`) — per-course progress (lessons, quiz result),
  and for pending Practical Evidence: description, attachment, **Approve/Reject** actions. Status
  updates are reactive and immediately visible back on the learner's Practical Evidence screen
  (same underlying store) — this is the loop Phase 2 left at "Pending Verification."
- Data/state: `src/lib/progress-store.tsx` refactored from single-learner to
  `learnerId → courseId → CourseProgress` (still no auth — the learner app always reads/writes
  the implicit `CURRENT_LEARNER_ID = 'you'`; Admin reads/writes any learner via the new
  `useAdminProgress()` hook, including `setEvidenceStatus`). `src/lib/mock-learners.ts` adds two
  static seeded learners (Casey Nguyen, Marcus Webb) alongside "you" so the roster isn't a list
  of one — one seeded with a pending evidence submission ready to review. `src/lib/course-status.ts`
  derives a single status label/tone (Not Started → In Progress → Assessment/Evidence Pending →
  Pending Verification → Verified/Needs Resubmission) shared by the roster and profile views.

**Key flow validated:** Admin authors a course's structure, then reviews and verifies a learner's
submitted evidence (Admin half of Section 5's flow; single-Admin-role model).

**Depends on:** Phases 1–2 (content structures and evidence submissions must exist to manage/review).

**Prototype assumptions made (flagged, not silently expanded):**

- Two extra static mock learners were seeded (beyond "you") purely so the roster has more than
  one row — a fuller varied multi-learner seed is still Phase 5 scope per this doc.
- No delete/edit/reorder on curriculum items — only additive authoring (add section/lesson/question).
- Curriculum additions sync to the learner view via shared browser localStorage, not a real
  backend — realistic for a single-device prototype demo, not a substitute for actual persistence
  once this becomes a real multi-user product.

**Follow-up fix (same session):** the learner sidebar's Practical Evidence step originally showed
a green checkmark as soon as evidence was _submitted_, which misleadingly looked identical to
_verified_. Fixed: the sidebar step and the My Learning card (`MyLearningCard.tsx`) both now use
the shared `getCourseStatus` helper (`src/lib/course-status.ts`) to distinguish Pending
Verification (amber dot) from Verified (green check) from Needs Resubmission (red dot) — a
learner can now tell evidence was approved without opening the course.

**Explicitly NOT built yet:**

- Analytics, Settings (future/simple per Section 9).
- **Program/Pathway Builder** — a **future capability, out of scope for this prototype**. No
  UI, no CRUD, no implementation time. Curriculum Builder does _not_ manage course ordering or
  program-level structure.
- Any multi-role split (reviewer/coordinator, etc.).

**Architecture note (carried forward, do not violate):** keep course data and Admin nav structured
so a future Program/Pathway Builder could slot in later without rework — e.g. don't bury course
sequencing logic inside the course-editing UI itself. Nothing program-level gets built now.

**Bug fixed (same session):** `/admin/learners/you` 404'd because `CURRENT_LEARNER_ID` was
defined in `progress-store.tsx` (a `'use client'` file) and imported into `mock-learners.ts`,
which is used from a Server Component — the value resolved to `undefined` server-side. Moved the
constant to a new plain module, `src/lib/constants.ts`, importable safely from both client and
server code.

**Verified:** `tsc --noEmit`, `npm run lint`, `npm run build` all pass clean; all 15 routes
generate; user walked the full admin loop (curriculum authoring visible to learner, evidence
approve/reject reflected live on My Learning and the course sidebar) in the browser and approved.

**Completion criteria:** Admin can create a course end-to-end via mock data and approve/reject a
learner's submitted evidence, reflected back on the learner side.

---

## Phase 4 — Outcomes: Competency, Credentials, Certificates, Portfolio ✅ DONE

**Goal:** Validate the payoff loop.

**Built:**

- Course/competency completion state: no separate "credential" record is stored — an approved
  Practical Evidence submission (`evidence.status === 'approved'`) _is_ the completion signal.
  `src/lib/credentials.ts` (`getCredentials`) derives the learner's earned credentials from
  existing progress data at render time. `EvidenceSubmission` gained a `statusUpdatedAt` field
  (`src/lib/progress-store.tsx`) so Portfolio/Certificates can show a real "verified on" date
  distinct from the original submission date.
- **Certificates** (`/learner/certificates`) — a card per verified course ("Earned" badge, issue
  date) opening a Dialog with a full certificate layout (`src/components/learner/CertificateDocument.tsx`,
  `CertificateCard.tsx`): learner name, course title, category, issue date, a mock certificate id
  (`NFCAP-<COURSE-ID>`). Empty state when nothing's verified yet.
- **Portfolio** (`/learner/portfolio`) — one entry per verified course: description, attachment,
  "Verified {date}" badge. Same underlying data as Certificates, different presentation (evidence
  detail vs. formal certificate) per Section 9's IA. Empty state when nothing's verified yet.
- Practical Evidence screen (`EvidenceView.tsx`) now closes the loop visibly: an **approved**
  submission shows a "View Certificate" button straight to `/learner/certificates`; a **rejected**
  submission shows "Resubmit Evidence," which reopens the form (prefilled with the previous
  description) and resubmits to `pending` for another review pass — this resubmission path wasn't
  explicitly speced but follows directly from "Needs Resubmission" being a reachable state.

**Key flow validated:** Verification → Course Completion → Credential → Portfolio → Certificates
(closes Section 10's flow) — approve evidence in Admin, then the learner immediately sees Verified
on My Learning, an entry on Portfolio, and a certificate on Certificates, all from the same
underlying store with no extra step.

**Depends on:** Phase 3 (verification action must exist to trigger completion).

**Explicitly NOT built yet:** Portfolio sharing/export (explicitly out of scope), any
Placement/employer-facing feature (out of scope entirely), real certificate file
generation/download (the certificate is an on-screen visual only, not a PDF).

**Verified:** `tsc --noEmit`, `npm run lint`, `npm run build` all pass clean; all 15 routes
generate; user approved evidence in Admin and confirmed the certificate/Portfolio/My Learning
status all updated correctly in the browser.

**Completion criteria:** Approving evidence in Admin visibly produces a completed course, a
credential, an updated Portfolio entry, and a certificate for the learner.

---

## Phase 5a — Program/Pathway Builder 🔲

**Goal:** Let Admin manage the apprenticeship pathway's course order and lock rules directly,
instead of order being append-only (new courses already land at the end via `createCourse`, but
nothing lets Admin reorder or insert afterward).

**Decided 2026-09-13:** pulled into scope (previously future-only, see Phase 3 note and Section 9
of `docs/product/PRODUCT_CONTEXT.md`). No schema change — reuses `Course.pathwayOrder` and
`Course.access` (OPEN/RESTRICTED), and the lock logic already in `PathwayCourseCard.tsx`
(`locked = !enrolled && course.access === 'restricted' && !unlocked`). Linear pathway only — no
branching/conditional logic, no multiple parallel programs, no new prerequisite graph.

**Build:**

- New standalone `/admin/pathway` screen with its own `adminNav` entry (decided 2026-09-13 —
  not a tab on Courses; Admin wanted it as its own nav item since Courses will keep growing).
- Drag-to-reorder list (`@dnd-kit/core` + `@dnd-kit/sortable`) of all courses (any publish state),
  showing title, category, and an Open/Restricted toggle per row (`PathwayView.tsx`, shared
  between this page and — previously — the Courses tab; now only used here).
- Server action to persist reordering: recompute `pathwayOrder` for all affected courses in one
  transaction; revalidate the same paths `createCourse`/`setCoursePublished` already revalidate.
- Server action (`setCourseAccess`) to toggle `access` per course from this view.

**Depends on:** Phase 3 (Courses admin, `createCourse`, `Course.pathwayOrder`/`access` already exist).

**Explicitly NOT built:** branching/conditional pathways, multiple parallel programs, a
prerequisite graph beyond "previous course in sequence," learner-assignment UI (already covered
by Enroll/roster), any change to WIOA `CourseUnlock` overrides.

**Built 2026-09-13:** `/admin/pathway` (own nav entry, `src/lib/nav.ts`) — list page showing the
one pathway as a summary card (`PathwayListView.tsx`: course count, total learners, completion
rate, sourced from `getPathwaySummary()` in `src/lib/data/pathway.ts`, which derives from existing
`getAllCourses`/`getLearnerRoster`/`getProgressByLearner`, no new table). Opening the card goes to
`/admin/pathway/apprenticeship` (`PathwayDetailView.tsx`) — same stats plus the drag-to-reorder
list (`PathwayView.tsx`, shared) and a static description block. `reorderPathway`/`setCourseAccess`
server actions in `src/lib/actions/courses.ts`. No schema migration. `tsc`, lint, and `next build`
verified clean.

**Design note:** the list/detail split mirrors a reference (Trenning/Fikri Studio "Learning Path")
the user was drawing on, scaled down for a single pathway — no multi-pathway list, no flowchart
canvas, no branch/condition nodes (see Section 5/15 of `docs/product/PRODUCT_CONTEXT.md` — single
linear pathway only, until NFCAP confirms otherwise).

**Corrected 2026-09-13:** the detail page initially had a "Preview as Learner" button copied
directly from the reference screenshot, linking to `/learner/explore`. `src/proxy.ts` confines
every signed-in session to its own role prefix by design ("no cross-role preview in this
prototype"), so the link only ever bounced Admin back to `/admin`. Re-added on request as a
**disabled UI-only placeholder** (no href, `disabled`, tooltip: "Not yet implemented — role-preview
isn't supported in this prototype yet") — the visual is wanted now, the capability is deferred
until real cross-role preview is built (would need an explicit admin-only bypass in `proxy.ts`).

---

## Phase 5 — UX Polish & Prototype Validation 🔲

**Goal:** Make the prototype presentation-ready; confirm it holds together end to end.

**Build:**

- Responsive pass across all screens.
- Empty/loading/edge states.
- Visual consistency pass against Section 11 (hierarchy, CTAs, avoid card-overload).
- A couple of "seeded" mock learners at different journey stages, for demoing the full flow.
- Learner Profile screen (`/learner/profile`) gets real content here if not already covered.

**Depends on:** All previous phases.

**Explicitly NOT built:** Any backend/persistence work, real auth, production infra.

**Completion criteria:** You can walk someone through the entire learner and admin journey on
mock data without UX or visual dead-ends.

---

## Corrections / decisions log

Keep this section updated whenever a locked decision changes mid-build, so we don't relitigate it.

- **2026-09-08 — Curriculum Builder scope corrected.** Originally specified as a program-pathway
  tool; corrected to be scoped to a single course (Course → Sections → Lessons → Content →
  Assessments). A Program/Pathway Builder is future scope only — not built in this prototype.
  `docs/product/PRODUCT_CONTEXT.md` Section 8 and 9 updated to match.
- **2026-09-13 — Program/Pathway Builder pulled into scope.** Course order was append-only
  (`createCourse` always adds to the end); Admin had no way to reorder or insert. Added as Phase
  5a: a lightweight "Pathway" tab on `/admin/courses` (drag-to-reorder + Open/Restricted toggle),
  reusing existing `pathwayOrder`/`access` fields — no schema change, no branching/graph builder.
  `docs/product/PRODUCT_CONTEXT.md` Section 9 updated to match.
