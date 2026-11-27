# NFCAP LMS — Project Handoff

A plain-language overview of this project for anyone joining — no coding background required.
If you need the technical/engineering details, ask whoever hands this off for the developer-level
notes; this doc is about what the project *is* and *where it stands*.

**Last updated:** 2026-11-27

---

## 0. Start here (updated 2026-11-27)

**How we work** is `docs/DEV-APPROACH.md` — read it straight after this file. It outranks any chat
message: two Claude sessions (lead/QC and builder), four approval gates, Plane for tickets.

**This document is the plain-language overview. For what is actually being built right now, read
`CLAUDE.md`'s "Current state" section** — that is kept current per piece of work; this file is
updated at milestones and will always lag it a little.

**The design phase is finished.** All four approval gates passed, and the mockup canvas exists with
its boards drawn and approved. Design work now happens as *amendments* to already-approved boards,
not as new gates. The current work is the build, phase by phase.

| Read | For |
| --- | --- |
| `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` | **The build plan** — what is in scope, what it costs, what order it ships |
| `CLAUDE.md` → "Current state" | What is done, what is in flight, what is blocked, right now |
| `docs/SITEMAP.md` | Route → screen → board → ticket → phase → roles map. Populated. |
| `docs/MOCKUP-INDEX.md` | Every board with phase, status, approval. Populated; canvas URL at the top. |
| `docs/design/DESIGN_CANVAS_ROADMAP.md` | The design execution plan — historical now that the gates have passed |
| `docs/design/LEARNER_UI_REFERENCES.md` | What each screen is modelled on, the brand brief, what was rejected and why |

**Dropped, do not use as sources:** `docs/design/NFCAP_DESIGN_SYSTEM.md` and
`docs/design/NFCAP_DESIGN_TOKENS.md`. The first is kept only for its WCAG contrast computations, the
dual-tone focus-ring technique and the four course-card states.

---

## 1. What is this project?

NFCAP is a real-world organization that trains apprentices for careers in flooring (think:
trade-school style training that leads to a certification). This project is building them a
custom **learning management system (LMS)** — a website where:

- **Trainees (learners)** work through courses, watch/read lessons, take quizzes, submit proof of
  hands-on work, and earn certificates as they progress.
- **NFCAP staff (admin)** build and manage the courses, track every trainee's progress, and review
  the proof of hands-on work before certifying someone.

It began as a **prototype** — built to prove out the idea, the screens and the workflows. That
stage is over: the prototype was accepted and an agreed production build plan is now being worked
through (65 pieces of work across 9 stages). It is a real, working website with a real database
behind it, and most of it is built — but **nothing is live for real users yet.** Everything
completed so far sits on an internal testing environment, not a public one. A few things are still
deliberately scoped down (explained in Section 6).

---

## 2. The training journey, in plain terms

1. A trainee signs up and browses available training ("Explore").
2. They enroll in a course and move through its lessons.
3. After finishing the lessons, they take a short quiz.
4. They then submit real-world proof of their work (a description, maybe a photo/document).
5. An NFCAP staff member reviews that proof and approves or rejects it.
6. Once approved, the trainee earns a certificate and it's added to their personal portfolio.

The important rule: **finishing the lessons and passing the quiz is not enough.** A course only
counts as complete once a staff member has personally verified the trainee's hands-on proof. This
reflects how real trade skills actually get certified — you can't test tile-setting skill inside a
website, so the website's job is to collect and support review of real evidence, not simulate the
skill itself.

Courses are also organized into one ordered sequence (a "pathway") — e.g., Safety & Tools →
Flooring Fundamentals → Tile Installation → Professionalism — so trainees earn credentials as they
go, not just at the very end.

---

## 3. Who uses it

| Who | What they do |
| --- | --- |
| **Trainee (Learner)** | Browses and takes courses, submits proof of work, earns certificates. |
| **NFCAP Staff (Admin)** | Builds courses, manages the trainee list, reviews and approves/rejects submitted proof, manages the overall course order. |
| **Partner Staff** *(funding add-on)* | Helps specific trainees through the funding paperwork process — only sees the trainees assigned to them. |
| **Funding Coordinator** *(funding add-on)* | Oversees all funding cases and the money/approval side of funding. |

The last two roles exist only for the funding feature described below — they're not part of the
core training experience.

---

## 4. The funding add-on (WIOA)

Separately from the training itself, there's a feature that helps trainees get **government
funding** (through a federal program called WIOA) to pay for their training instead of paying out
of pocket.

In plain terms: a trainee enters their address, gets matched to their local government workforce
office, reaches out to that office through the app (the app helps draft the message, but a real
person at NFCAP or the workforce office handles it from there — there's no automatic government
system connection), uploads some paperwork, and staff track that paperwork through a multi-step
approval process. Once funding is approved, the trainee's course unlocks for them automatically —
they don't pay for it themselves.

This is a bolt-on feature — it doesn't change how the core training works, it just gives trainees
a second way to "unlock" a course besides paying for it themselves.

---

## 5. Current status

**First, the thing that matters most:** nothing is live for real trainees yet. Work that is
finished sits on an internal testing environment. "Done" in the list below means built, reviewed
and working there — not in front of users.

**Done and working:**
- The entire core trainee journey described in Section 2 (browse → enroll → learn → quiz →
  submit proof → get verified → earn certificate/portfolio).
- Staff tools to build courses, manage the trainee roster, and review submitted proof.
- Staff tools to set and reorder the overall course sequence.
- The full funding add-on (Section 4) — matching, outreach, document upload/review, staff
  dashboards, and the funding approval pipeline that unlocks a course.
- **Proof of hands-on work is now assessed point by point.** Instead of one all-or-nothing
  approval, each course has a checklist of specific things a trainee must demonstrate; staff mark
  each one met or not met, can annotate photos, and ask for just the missing pieces again rather
  than the whole submission. Certification is blocked until every required point is met.
- **Security, accounts and email.** Sign-in hardening, password reset, email verification, account
  settings for every role, and staff screens for managing roles and deactivating accounts.
- **The design system**, applied across the app, so screens are visually consistent.
- **Downloadable certificates, and a way to check one is genuine.** Certificates download as a PDF,
  and there is a public page where anyone — an employer, say — can verify a certificate is real
  without needing an account.

**In progress right now:**
- **Notifications** — an in-app bell so trainees and staff are told when something needs them
  (e.g. proof has been reviewed). Deliberately in-app only for now; see Section 7.

**Not done yet:**
- A trainee's personal profile page still needs real content.
- Accessibility and performance passes, and the work to put the site live properly (backups,
  recovery practice, a separate staging copy).
- Several smaller staff-facing features — messaging between trainees and staff, reporting
  refinements, and the remaining notification triggers.

**Still an open question for NFCAP (not yet decided):**
- The exact rule for which courses someone can sign up for freely vs. which require assignment or
  funding approval.
- Whether NFCAP will ever need more than one training pathway (e.g. different tracks for
  different states or trades) — right now the system assumes just one.
- **Does any piece of funding paperwork need more than one file?** Each required document holds one
  file today — uploading again replaces what was there. If, say, "proof of income" really means
  three months of payslips, that needs rethinking. This one is blocking a piece of work.
- **The course checklists have no real content yet.** The point-by-point assessment described above
  works, but the actual points to assess are placeholders until NFCAP's trade experts write the
  real ones. That is a working session with them, not a coding task.

---

## 6. What this is deliberately *not* doing (by design, not by accident)

To keep the prototype focused, these were specifically decided against — so nobody should be
surprised they're missing, and nobody should quietly add them without a conversation first:

- **No job placement features.** The system stops at "trainee is certified" — it does not help
  place anyone in a job or involve employers at all.
- **No employer or mentor accounts.** Only trainees and NFCAP staff (plus the two funding-only
  roles above) use this system.
- **No direct connection to government systems.** All the funding back-and-forth with the
  workforce office is handled by a real person, not an automatic data link.
- **No automatic re-issuing of certificates.** If a course's content changes after someone is
  certified, nothing re-checks or re-issues their existing certificate.
- **Only one straight-line training pathway** — no branching tracks or multiple parallel programs.

---

## 7. Known rough edges and current constraints

**Both rough edges previously listed here are fixed** (2026-11-27): the unlimited re-upload of
funding documents now has a sensible limit, with a clear explanation to the trainee when it is
reached and a record kept for auditing; and the funding paperwork can no longer be filled in out
of order.

Two constraints remain, neither of them faults in the software:

- **Email cannot be sent to real addresses yet.** Sending email from a domain requires a small
  technical setup on that domain's settings, which needs access NFCAP has not provided. Until
  then, email only reaches a single test address. This is why notifications are being built as an
  in-app bell first — it needs nothing from anyone else, and email can be added later as a second
  way of delivering the same alerts. **This must be resolved before real trainees use the system**,
  since sign-up confirmation and password reset both depend on it.
- **The course assessment checklists contain placeholder content** until NFCAP's trade experts
  write the real ones (see Section 5).

---

## 8. How decisions get made on this project

The product direction is owned by the project's designer/product owner. The working rhythm for
every new piece of work is: understand the problem → think through the user experience → bring
options when there's a real choice to make → get a decision → then build it. Nothing about scope,
navigation, or what a role can/can't do gets changed quietly — if it was already decided
(Sections 5–7 above are the record of those decisions), it needs a real conversation to revisit,
not a silent change.

---

## 9. Where to go for more detail

This document is the plain-language summary, and it is updated at milestones — so it will always
lag the day-to-day state a little. For anything time-sensitive, go to the source:

| Question | Where |
| --- | --- |
| What is being built right now, and what is blocked | `CLAUDE.md` → "Current state" |
| What is in scope, what it costs, what order it ships | `docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md` |
| Detail behind any one feature | `docs/client/NFCAP_LMS_Feature_Detail_Client.md` |
| Stage-by-stage build progress | `docs/build/PHASE_<n>_PROGRESS.md` |
| How the team works | `docs/DEV-APPROACH.md` |

**A note for anyone maintaining this file:** it is named as the onboarding entry point in
`CLAUDE.md`, so when it goes stale it misleads *every* new person and session that starts here.
Between 2026-10-25 and 2026-11-27 it went a month without an update while four stages of work
shipped, and in that time it was telling readers the design work hadn't started, that proof-of-work
files couldn't be uploaded, and that certificates couldn't be downloaded — all three long since
built. Update it at the end of each stage, not "when there's time."
