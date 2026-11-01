# NFCAP LMS — Project Handoff

A plain-language overview of this project for anyone joining — no coding background required.
If you need the technical/engineering details, ask whoever hands this off for the developer-level
notes; this doc is about what the project *is* and *where it stands*.

**Last updated:** 2026-10-25

---

## 1. What is this project?

NFCAP is a real-world organization that trains apprentices for careers in flooring (think:
trade-school style training that leads to a certification). This project is building them a
custom **learning management system (LMS)** — a website where:

- **Trainees (learners)** work through courses, watch/read lessons, take quizzes, submit proof of
  hands-on work, and earn certificates as they progress.
- **NFCAP staff (admin)** build and manage the courses, track every trainee's progress, and review
  the proof of hands-on work before certifying someone.

This is currently a **prototype** — built to prove out the idea, the screens, and the workflows
before anyone invests in a full production system. It is a real, working website with a real
database behind it (not just mockups), but it's still intentionally scoped down in a few places
(explained in Section 6).

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

**Done and working:**
- The entire core trainee journey described in Section 2 (browse → enroll → learn → quiz →
  submit proof → get verified → earn certificate/portfolio).
- Staff tools to build courses, manage the trainee roster, and review submitted proof.
- Staff tools to set and reorder the overall course sequence.
- The full funding add-on (Section 4) — matching, outreach, document upload/review, staff
  dashboards, and the funding approval pipeline that unlocks a course.

**Not done yet:**
- A general visual polish pass — making sure every screen looks and behaves well on all devices,
  handles edge cases gracefully (e.g. empty states), and feels fully consistent.
- A trainee's personal profile page still needs real content.
- A couple of small, known rough edges in the funding feature (see Section 7) that don't block
  using it, but would be worth tightening before this goes to real users.

**Still an open question for NFCAP (not yet decided):**
- The exact rule for which courses someone can sign up for freely vs. which require assignment or
  funding approval.
- Whether NFCAP will ever need more than one training pathway (e.g. different tracks for
  different states or trades) — right now the system assumes just one.

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
- **No file storage for the hands-on proof yet** — trainees currently just type a description and
  attach a filename; actual file upload/storage for that specific piece is still a planned
  improvement.
- **No real downloadable certificate (PDF).** Certificates currently display on-screen only.
- **Only one straight-line training pathway** — no branching tracks or multiple parallel programs.

---

## 7. Known rough edges (minor, logged, not urgent)

- A trainee can technically re-upload a funding document as many times as they want with no
  limit — harmless for now, but could pile up unnecessary files if this scales up.
- The funding-approval paperwork can technically be filled in by staff a little earlier in the
  process than it logically should be — a minor sequencing gap, not a security or data issue.

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

This document is the plain-language summary. If you (or whoever you're handing this to) need the
technical, file-by-file detail — exact screens, data tables, code locations, and a full
phase-by-phase build log — that level of documentation also exists and can be provided separately.
