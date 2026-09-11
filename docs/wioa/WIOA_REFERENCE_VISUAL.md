# WIOA Eligibility and Apprenticeship Funding Process — Reference Visual

Source: `docs/wioa/wioa-funding-process-flow.png` (infographic, not authored by NFCAP or by us). Transcribed verbatim as a source-of-truth reference so later work can be tallied against it. This is the "reference visual diagram" / "reference visual flow" referred to throughout `docs/wioa/WIOA_INTEGRATION_PLAN.md` (§2a, §5a, §7, §8, §11) — that plan has already reconciled most of this content against the spec PDF; this file exists so the diagram itself is checkable without re-opening the image.

Tagline: "Connect · Qualify · Train · Build Futures"
Footer tagline: "Right People · Right Opportunities · Stronger Communities · Powered by Opportunity."

---

## Main Pipeline — 6 Steps

### 1. Student Registration

**Create Account**
- Name
- Date of Birth
- Email / Phone
- Address (City/ZIP)
- Employment Status
- UI Status
- Training Interest

**Confirm Your Information** — Review and submit profile

**Account Created** — Student profile is saved

### 2. Workforce Board Matching

**Enter Home Address or ZIP Code** — System automatically matches to the correct workforce board

**View Your Workforce Center**
- Workforce Board
- AJCC / Career Center
- Address
- Point of Contact
- Email
- Phone
- Intake Instructions

**Confirm Match** — This is your assigned workforce board

### 3. Initial Contact (Direct Email from App)

**Send Prewritten Email**
- Auto-filled with your information
- Sent to the correct point of contact
- Review and click "Send"

**Email Logged** — Date, recipient, and status are tracked in the app

**Await Response** — Automatic reminders if no response within 3 business days

### 4. Complete WIOA Eligibility Process

**Follow Workforce Board Instructions**
- Attend orientation
- Create CalJOBS account
- Complete application
- Submit required documents
- Attend intake appointment

**Required Documents**
- ID (DL/State ID/Passport/Birth Certificate)
- Social Security Card
- Selective Service Verification (required)
- EDD Award Letter (if applicable)

**Eligibility Determination** — WIOA Eligible or Not Eligible

### 5. Request Apprenticeship Training Funding

**Select ETPL Apprenticeship Program**
















- Choose training program
- Confirm ETPL status
- Review program details (tuition, length, occupation)

**Request WIOA Funding**
- Submit training request
- Case manager review
- ITA / training authorization
- Tuition approval

**Funding Approved** — Receive authorization for approved training program

### 6. Enroll in Apprenticeship Program

**Begin Training** — Enroll in your ETPL apprenticeship program using WIOA funding

**Track Your Progress**
- Training start date
- Program milestones
- Completion status

**Complete Program** — Gain skills, credentials, and career opportunities

---

## Cross-Cutting Support Row (below the 6-step pipeline)

**Ongoing Support** — Get reminders, updates, and access to resources through the app

**Communicate in the App**
- View messages
- Track appointments
- Upload documents
- See next steps

**Support from Your Organization** — Your school or partner can also track your progress and help you stay on track

---

## System Dashboards

"Real-time tracking for students, partners, and administrators."

**Student Dashboard**
- View progress
- Upcoming appointments
- Document status
- Next steps

**Partner Dashboard**
- Track multiple students
- Monitor completion rates
- Identify missing requirements
- Run reports

**WIOA Coordinator Dashboard**
- Manage cases
- Track communications
- Update statuses
- Monitor funding requests

**Administrator Dashboard**
- Manage workforce board data
- Update contacts
- Configure routing rules
- System reporting and analytics

---

## Notes for reconciliation with `WIOA_INTEGRATION_PLAN.md`

These are pointers only — see the plan doc for the actual resolved decisions:

- The 6 phases here map to the plan's 6 UI-facing phases (§8), which group the spec's full 18 backend statuses.
- "Communicate in the App" bullets (messages/appointments/documents/next steps) were evaluated against real in-app chat and resolved as a **read-only consolidated activity feed**, not two-way messaging (plan §7).
- The 3-business-day no-response reminder under Step 3 is explicitly deferred to a later automation phase, not built in Phases 1–4 (plan §11, Automation & Follow-Up Rules).
- Partner Dashboard vs. WIOA Coordinator Dashboard bullets are the basis for the `PARTNER_STAFF` vs `WIOA_COORDINATOR` role/funding-visibility split (plan §5a) — note Partner Dashboard never mentions funding, Coordinator Dashboard explicitly does ("Monitor funding requests").
- Registration fields listed here (Name, DOB, Email/Phone, Address, Employment Status, UI Status, Training Interest) match the plan's "Learner profile additions" list (§5), plus `trainingApprenticeshipInterest`/`fundingSource` which the plan added beyond what this diagram shows.
