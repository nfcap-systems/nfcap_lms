# NFCAP LMS — Feature Detail (Appendix)

*Companion to the [Build Plan](NFCAP_LMS_Production_Scope_Summary_Client.md). The plan shows the structure; this appendix holds the full description, roles, platform, complexity and a note for every feature. The system is a **web application**; a mobile app is a future add-on.*

## Feature Detail by Phase

### Phase 0 — Quality Foundations & Delivery Pipeline

**Foundation** · 6 features · **142h**

**Goal:** Automated tests, checks on every change, monitoring, staging and proven backups; sign off the WIOA funding module.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Verification** | **WIOA Funding Module Sign-Off** | Manually verify the funding module end to end — case creation, document review, staff roles and the funding approval that unlocks a course — and formally sign it off. | All | Both | Medium | 24 | Oldest open item in the project; unverified behaviour here would surface later as production bugs. |
| **QA** | **Automated Test Suite — Critical Paths** | Introduce automated testing and cover the paths where a silent failure would be most damaging: login and roles, course access rules, evidence approval issuing a certificate, and funding status changes. | Admin | Both | High | 40 | Without automated tests every change would have to be verified by hand, so this is the safety net for everything built later. |
| **DevOps** | **Automated Checks on Every Change (CI)** | Every change is automatically type-checked, linted, tested, accessibility-scanned and build-verified before it can be accepted — so a broken change cannot reach the live site. | Admin | Backend | Medium | 20 | Low. |
| **Reliability** | **Error Handling, Logging & Monitoring** | Replace raw technical errors with clear messages for users, and add structured logging plus alerting so the team learns about a problem before a trainee reports it. | All | Both | Medium | 24 | Users must see clear messages instead of raw technical errors. |
| **DevOps** | **Staging Environment & Migration Strategy** | A separate staging site that mirrors production, plus a documented, rehearsed process for applying database changes to live data without downtime or loss. | Admin | Backend | Medium | 20 | Database changes need a rehearsal on staging before they touch live data. |
| **Reliability** | **Backup, Restore & Recovery Drill** | Configure database backups and then actually prove them by restoring from backup in a timed drill — so recovery is a known procedure, not an assumption. | Admin | Backend | Low | 14 | Low — but untested backups are the commonest cause of real data loss. |

**Done when**

- [ ] The WIOA funding module is verified end to end and signed off
- [ ] Automated tests cover enrollment gating, evidence → certificate, and funding status changes
- [ ] A broken change cannot reach the live site
- [ ] Errors are tracked and alerted on; a restore from backup has been proven in a drill

### Phase 1 — Security & Data Protection

**Foundation** · 9 features · **156h**

**Goal:** Put protections in place before any real trainee or WIOA data enters the system.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Security** | **Database Access-Rule Approach — Decision** | A short, decisive investigation into how database-level access rules work with the data layer, so the security model is chosen on evidence rather than assumption, and documented. | Admin | Backend | Medium | 16 | The data layer connects with elevated privileges, which can bypass database-level rules. This must be settled before policies are written, or the result is false confidence. |
|  | **Row-Level Access Rules (RLS)** | Enforce at the database level that a trainee can only ever reach their own records, and staff only the cases assigned to them — a second line of defence behind the application's own checks. | All | Backend | High | 36 | Primary protection for WIOA funding data; depends on the decision above. |
| **Audit** | **Platform-Wide Audit Trail** | Record who did what and when across sensitive activity — viewing a funding document, changing a role, approving evidence, exporting data — producing a defensible compliance record. | Admin | Backend | Medium | 24 | Every sensitive action must be recorded, not only funding status changes. |
| **Privacy** | **No-SSN Rule & PII Boundary** | Make it structurally impossible for the system to store a Social Security Number, and document exactly which personal information it does hold — removing a large part of the compliance burden by design. | Admin | Backend | Low | 12 | Low — and it materially reduces risk elsewhere. |
|  | **Data Retention & Destruction Policy** | Implement a defined retention period for funding records and credentials, with automatic, logged destruction once it expires — so data is not held indefinitely. | Admin | Backend | Medium | 20 | Retention periods are to be confirmed; held as configuration so they can change without code. |
| **Security** | **Secrets, Environment & Rate Limiting** | Secure management of keys and credentials, hardened environment configuration, and limits on login and upload attempts to prevent abuse. | Admin | Backend | Medium | 18 | Low. |
| **Legal** | **Terms of Service & Privacy Policy** | Published terms and a privacy policy that accurately describe what the system collects and how it is used — required before collecting real personal information. | All | Web | Low | 10 | Low. |
| **Architecture** | **Pathway Structure Seam** | Introduce a formal 'pathway' record that holds the apprenticeship pathway — inexpensive now, and the reason adding further pathways later is a small change rather than a rebuild. | Admin | Backend | Low | 12 | Low now; retrofitting this after real progress data exists would be costly. |
|  | **Hour-Derivable Progress History** | Keep lesson and enrollment history recorded with full timestamps rather than summary counters, so training hours can be reported later if federal apprenticeship reporting is required. | Admin | Backend | Low | 8 | Low now; collapsing this history would permanently prevent hour reporting. |

**Done when**

- [ ] Database-level access rules are in place, or a documented alternative with compensating controls
- [ ] Sensitive activity is fully audit-logged and exportable
- [ ] The system cannot store an SSN; retention and destruction run automatically
- [ ] Terms and privacy policy are live; secrets and rate limits are hardened

### Phase 2 — Accounts, Access & Email

**Foundation** · 7 features · **108h**

**Goal:** The everyday account functions every real service needs: email, password reset, roles, offboarding.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Email** | **Transactional Email Infrastructure** | A reliable email delivery service properly configured for the NFCAP domain, so system email arrives in inboxes rather than spam folders. | All | Backend | Medium | 16 | Dependency for password reset, verification and notifications — sequenced first for that reason. |
| **Auth** | **Password Reset** | A secure 'forgot password' flow so a trainee or staff member locked out of their account can get back in without contacting support. | All | Both | Low | 16 | Without a recovery path a locked-out user cannot return — a hard launch blocker. |
|  | **Email Verification** | Confirm a new account's email address before it becomes active, so accounts genuinely belong to the person using them. | All | Both | Low | 14 | Without verification, anyone could sign up with any email address. |
| **Accounts** | **Account Settings** | Let every user change their own password and email address, and manage their basic profile, from one screen. | All | Both | Low | 14 | Low. |
|  | **Role Management Screen** | A proper staff screen for assigning and changing roles (Learner, Admin, Partner Staff, Coordinator), so no developer script is needed. | Admin | Web | Medium | 20 | NFCAP staff must be able to manage roles themselves, without a developer. |
|  | **User Deactivation & Offboarding** | Safely deactivate a departed trainee or staff member — access ends immediately while their records and credentials are preserved for compliance. | Admin | Web | Medium | 16 | Low. |
| **Auth** | **Session & Login Hardening** | Sensible session lifetimes, secure cookie handling and protection against repeated login attempts. | All | Backend | Low | 12 | Low. |

**Done when**

- [ ] A locked-out user can reset their own password by email
- [ ] New accounts must verify their email address
- [ ] Staff can assign roles and deactivate users from the interface, with no developer involvement
- [ ] System email reliably reaches inboxes from the NFCAP domain

### Phase 3 — Evidence & Competency ★

**Core Product** · 12 features · **260h**

**Goal:** Real photo evidence, assessed criterion by criterion. Certification only when every required criterion is Met.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Evidence Storage** | **Real Evidence File Storage** | Trainees upload actual photos and video of their work into secure private storage, visible to staff reviewers through short-lived access links. | All | Both | High | 32 | The product's defining artefact, and the single largest build item. |
|  | **Image Downscaling & Storage Cost Control** | Automatically resize photos in the browser before upload and cap file sizes, keeping quality sufficient for assessment while controlling ongoing storage and bandwidth cost. | Learner | Both | Medium | 12 | Unmanaged phone photos would make hosting costs rise sharply as trainee numbers grow. |
| **Competency Model** | **Per-Course Assessment Criteria** | Define, per course, the specific things a trainee must demonstrate — each with guidance, whether a photo is required, and whether it is mandatory for certification. | Admin | Backend | Medium | 18 | Low technically — the real dependency is NFCAP's trade expertise to author them. |
|  | **Criteria Authoring Interface** | Let NFCAP staff create, edit, reorder and remove a course's assessment criteria from the course builder, alongside its lessons and quiz. | Admin | Web | Medium | 24 | Low — follows the content-block editing pattern used elsewhere in the course builder. |
|  | **Criteria Authoring Support (NFCAP)** | Working sessions with NFCAP's trade experts to capture credible, defensible assessment criteria for each course in the pathway, then load them into the system. | Admin | Web | Low | 12 | The feature is only as credible as the criteria; this cannot be substituted with our own assumptions. |
| **Review** | **★ Reviewer Queue** | A dedicated review queue showing every submission awaiting assessment — trainee, course, attempt, how long it has been waiting — with oldest first, so nobody is left waiting unnoticed. | Admin | Both | Medium | 24 | Low. |
|  | **★ Per-Criterion Review & Gated Certification** | The reviewer assesses each criterion Met or Not Met with a note, against the trainee's photos. Certification is impossible unless every required criterion is Met — so a credential always reflects a real, recorded assessment. | Admin | Both | High | 40 | This is the core value of the product — correctness is critical; built as an isolated, fully tested rules layer. |
|  | **Photo Annotation** | A reviewer can pin a comment directly onto a point on a photo — so feedback refers to the exact detail in question rather than a general remark. | Admin | Both | Medium | 20 | Low. |
| **Learner** | **Guided Evidence Capture** | The trainee sees exactly what they must photograph, criterion by criterion, with guidance and a progress indicator — and cannot submit until every required item is captured. | Learner | Both | High | 28 | Low — extends the course learning screen. |
|  | **Per-Criterion Feedback & Targeted Resubmission** | After review, the trainee sees which criteria passed, which did not, and why — then re-shoots only the failures, keeping everything already accepted. Rejection becomes instruction instead of a dead end. | Learner | Both | High | 24 | Directly affects completion rates — a bare rejection tells the trainee nothing. |
|  | **Attempt History** | Every submission attempt is kept and viewable by both trainee and reviewer, so the progression of someone's work is visible rather than overwritten. | All | Both | Low | 12 | Low. |
| **QA** | **Legacy Data & Regression Pass** | Handle any earlier submissions honestly, and confirm certificates, portfolio, dashboards, search and the funding module are all unaffected. | All | Both | Low | 14 | Low. |

**Done when**

- [ ] A trainee uploads real photos against each named criterion and cannot submit until all required items are captured
- [ ] A reviewer assesses every criterion Met / Not Met with notes pinned on the photo
- [ ] ★ A certificate cannot be issued unless every required criterion is Met
- [ ] A rejected trainee sees exactly what failed and re-shoots only that

### Phase 4 — Credential Integrity & Portability

**Core Product** · 4 features · **80h**

**Goal:** A credential trainees can hold, prove and carry: a PDF certificate with public QR verification.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Certificates** | **Downloadable PDF Certificate** | Generate a proper, well-designed PDF certificate a trainee can download, print, email or attach to a job application. | Learner | Both | Medium | 20 | Low. |
|  | **Public Verification Page + QR Code** | Each certificate carries a QR code and a short verification link. Anyone scanning it sees a public page confirming the credential is genuine, who it was issued to, when, and what was assessed — no login required. | All | Both | Medium | 20 | Shows limited personal information publicly by design — exact fields to be confirmed with NFCAP. |
|  | **Expiry & Renewal Reminders** | Give credentials a validity period where appropriate and remind holders ahead of expiry — keeping certified tradespeople current and bringing graduates back for renewal. | All | Both | Medium | 22 | Dependent on NFCAP's answer — effort stands but may be deferred. |
| **Portfolio** | **Shareable Verified Portfolio** | A shareable view of a trainee's verified work and credentials — a genuinely novel asset for a tradesperson to carry to an employer. | Learner | Both | Medium | 18 | Makes verified work visible outside NFCAP, so it requires an explicit NFCAP decision before build. |

**Done when**

- [ ] A trainee can download a PDF certificate
- [ ] Scanning a certificate's QR code publicly verifies it without a login
- [ ] Expiry and renewal behaviour is confirmed and, if required, implemented
- [ ] Portfolio sharing is either delivered or formally deferred by decision

### Phase 5 — Funding Module Productisation ★

**Core Product** · 7 features · **130h**

**Goal:** Make WIOA funding a clear, working process for trainees and staff: status, delivered email, impact reporting.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Learner Experience** | **Funding Progress Transparency** | Show the trainee exactly where their funding application stands, what happens next, and who is responsible. | Learner | Both | High | 28 | Low technically; high product value. |
|  | **Eligibility Self-Check** | A short questionnaire that tells someone in about two minutes whether funding is likely worth pursuing, before they commit to the full process. | Learner | Both | Medium | 20 | Must be clearly worded as guidance, not a decision, to avoid misleading applicants. |
| **Communications** | **Outreach Email Delivery & Deliverability** | Actually send the workforce-board outreach email, correctly configured so replies reach the right person and messages survive government spam filtering, with delivery failures surfaced rather than silent. | All | Backend | High | 24 | The entire funding funnel depends on this email arriving. |
| **Case Management** | **Stalled-Case Detection & Follow-Up** | Flag funding cases with no movement for a set period, and prompt trainees with outstanding documents — because funding cases die from silence. | Partner Staff | Both | Medium | 20 | Low. |
| **Reporting** | **Funding Impact Reporting** | Report the funding NFCAP has actually unlocked — total value, approval rate, time to approval, by workforce board — the figures that justify the programme to leadership and funders. | Coordinator | Web | Medium | 22 | Low. |
| **Hardening** | **Document Upload Limits** | Apply sensible limits to repeated document uploads, so files cannot accumulate without bound as usage grows. | Learner | Both | Low | 8 | Low. |
|  | **Funding Approval Sequencing Fix** | Prevent funding paperwork from being completed earlier in the process than it logically should be, so the recorded sequence always reflects what actually happened. | Coordinator | Both | Low | 8 | Low — no security or data impact. |

**Done when**

- [ ] A trainee can see their funding stage, next step and who is responsible
- [ ] The self-check gives clear, correctly-qualified guidance before the full process
- [ ] Outreach email is genuinely delivered, with failures visible to staff
- [ ] Stalled cases are flagged and funding impact is reportable

### Phase 6 — Communication & Operations

**Operations & Access** · 8 features · **184h**

**Goal:** Day-to-day operations: messaging, announcements, cohorts, reporting and a quiz that cannot be gamed.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Messaging** | **Trainee ↔ Staff Messaging** | Direct messaging between a trainee and NFCAP staff, tied to the relevant course or funding case, so questions are asked and answered inside the system. | All | Both | High | 36 | Gives a stuck trainee a channel inside the system. |
|  | **Announcements** | Let NFCAP publish an announcement to all trainees or a specific group, shown in-app and optionally emailed. | Admin | Both | Low | 14 | Low. |
| **Notifications** | **Notification Coverage Completion** | Audit and complete notification coverage so every event that matters reaches the right person — evidence reviewed, document rejected, funding advanced, deadline approaching. | All | Both | Medium | 18 | Low. |
| **Operations** | **Bulk / CSV Enrollment** | Import and enroll a group of trainees from a spreadsheet in one action, with validation and a clear error report. | Admin | Web | Medium | 18 | Low. |
|  | **Cohorts & Deadlines** | Group trainees into cohorts and set target or due dates, so staff can manage a group rather than tracking individuals separately. | Admin | Web | Medium | 24 | Depends on how NFCAP runs intakes — to be confirmed. |
| **Reporting** | **Admin Reporting Depth** | Richer reporting for staff: completion trends by cohort, time to complete, and flags for trainees falling behind. | Admin | Web | High | 28 | Low. |
|  | **Data Export** | Export trainee, progress and credential data in a clean, standard format for reporting or migration. | Admin | Backend | Low | 14 | Low. |
| **Assessment** | **Quiz Engine Depth** | Additional question types, reusable question banks, randomised question order, and attempt limits — and stop revealing the correct answers on a retake. | All | Both | High | 32 | Retakes must not reveal correct answers, or the quiz is trivially gameable. |

**Done when**

- [ ] A trainee can message staff from inside the system and get a reply
- [ ] Announcements reach trainees and key events reliably notify
- [ ] A cohort can be enrolled from a spreadsheet in one action
- [ ] Quiz retakes no longer reveal the answers, and reporting covers cohort trends

### Phase 7 — Accessibility (WCAG 2.1 AA)

**Operations & Access** · 6 features · **102h**

**Goal:** Bring the whole interface to WCAG 2.1 AA, very likely required for WIOA-funded providers.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Compliance** | **Confirm the Accessibility Obligation** | Verify the exact accessibility requirement against the regulation itself and NFCAP's workforce-board contact, so the standard is confirmed rather than assumed. | Admin | Both | Low | 8 | The current sourcing is secondary — confirm before scoping remediation in detail. |
| **Accessibility** | **Accessible Drag-and-Drop Reordering** | Make the pathway reordering screen fully usable by keyboard and screen reader — the hardest accessibility pattern in the product. | Admin | Web | High | 20 | If left late, this can force a redesign of the screen — scoped explicitly for that reason. |
|  | **Dialog & Drawer Focus Handling** | Correct keyboard focus behaviour for every dialog and side panel, so keyboard and screen-reader users are never stranded. | All | Both | Medium | 14 | Low. |
|  | **Colour Contrast & Token Audit** | Audit the brand palette against contrast requirements and adjust the design tokens where needed, keeping the NFCAP identity intact. | All | Both | Medium | 16 | Low. |
|  | **Semantics, Labels & Keyboard Pass** | A full pass across every screen: heading structure, form labels, alternative text, visible focus, skip links and complete keyboard operability. | All | Both | High | 28 | Low, but broad — touches every screen. |
|  | **Screen Reader Journey Testing** | Manually test both the trainee and staff journeys end to end with a screen reader, and fix what that surfaces. | All | Both | Medium | 16 | Low. |

**Done when**

- [ ] The accessibility obligation is confirmed against primary sources
- [ ] Both primary journeys are fully operable by keyboard and screen reader
- [ ] Pathway reordering is accessible without a mouse
- [ ] Automated accessibility checks pass on every change

### Phase 8 — Performance, Hardening & Launch

**Launch** · 6 features · **116h**

**Goal:** Prove it performs and is secure at scale, sign the data agreement, and go live.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Performance** | **Load Testing & Database Tuning** | Test the system at the expected number of trainees and concurrent staff, then tune queries and indexes so every screen stays responsive. | Admin | Both | Medium | 24 | Scale assumption to be confirmed; a materially larger figure would expand this item. |
|  | **Caching & Media Delivery** | Cache appropriately and serve images efficiently, so evidence-heavy screens load quickly and bandwidth cost stays controlled. | All | Both | Medium | 16 | Low. |
| **Security** | **Independent Security Review** | An independent review of authentication, access control, data protection and file handling before real trainee data is loaded. | Admin | Both | High | 20 | Essential before real WIOA data; findings may generate follow-up work. |
| **Operations** | **Runbook, Monitoring & Incident Process** | Operational documentation, alerting and a defined process for handling an incident — so problems are handled procedurally rather than improvised. | Admin | Backend | Medium | 16 | Low. |
| **Compliance** | **Workforce Board Data Agreement (Gate)** | Support NFCAP in obtaining and implementing the signed data-sharing and confidentiality agreement with their workforce board, and align the system's handling to its terms. | Admin | Both | High | 12 | Real WIOA trainee data cannot legally enter the system without this — every earlier phase is designed to be buildable before it exists. |
| **Launch** | **User Acceptance Testing & Go-Live** | Acceptance testing with NFCAP staff and real trainees, a bug-fix pass, a full rehearsal, then go-live with support through the first week. | All | Both | Medium | 28 | Low. |

**Done when**

- [ ] The system performs acceptably at NFCAP's expected scale
- [ ] An independent security review is passed and findings addressed
- [ ] The workforce board data agreement is signed and implemented
- [ ] Acceptance testing is signed off and the system is live with monitoring and a tested recovery path

## Add-Ons (Outside the Base Plan)

Each add-on is gated on a client decision, or best scoped once the system is live. Each is quoted separately. Multi-tenancy (supporting organisations beyond NFCAP) was considered and **ruled out**: NFCAP confirmed single-organisation scope on 25 Oct 2026.

| # | Add-on | Description | Complexity | Hours | Gate / Note |
|---|---|---|---|---:|---|
| 1 | **Multi-Pathway / Multi-State Support** | Support more than one training pathway — for example a different track per state or trade — including management screens and per-pathway reporting. | High | 80 | Branch — pending: does NFCAP need more than one pathway? |
| 2 | **Training Hour Tracking & DOL Reporting** | Track Related Technical Instruction and On-the-Job Training hours and produce federal apprenticeship reporting (RAPIDS/WIPS), as required of DOL-registered programmes. | High | 120 | Branch — pending: is the programme DOL-registered? |
| 3 | **Self-Pay Checkout** | Let a trainee pay for a course directly, using the same course-unlock mechanism as funding. | Medium | 60 | Branch — pending: is self-pay a real route? |
| 4 | **Cross-Course Competency Framework** | Treat a demonstrated skill as its own record that can count toward more than one course — so a skill proven once need not be re-demonstrated, matching how trade competency actually works. | High | 56 | Industry-standard model; not needed for a single linear pathway. |
| 5 | **Advanced Analytics & At-Risk Prediction** | Deeper analytics including drop-off analysis, time-to-competency benchmarking and early identification of trainees at risk of not completing. | High | 48 | Best scoped after 6–12 months of live use. |
| 6 | **Mobile Evidence Capture (installable app)** | An installable, app-like experience with offline photo capture, camera-per-criterion, background sync and real-device testing, so trainees can capture evidence on a job site with poor or no signal. Detailed below. | High | 128 | Future — only if needed. The web app works in phone browsers. |
| 7 | **External Credential Registry Integration** | Publish NFCAP credentials into an external, industry-recognised registry so they are verifiable nationally rather than only through NFCAP. | Medium | ⚠ TBD | TBD until decided |
| 8 | **Native iOS / Android Apps** | Dedicated native iOS and Android applications, should the web app (and the optional installable app) prove insufficient in the field. | High | ⚠ TBD | TBD until decided |
| | **Subtotal (scoped items only)** | | | **492** | 2 item(s) TBD |

### Add-on detail — Mobile Evidence Capture

**128h** · 5 features · quoted separately; build only if the web app proves insufficient on site.

**Goal:** Let trainees capture evidence on a phone at the job site, even with no signal.

| Module | Feature | Description | Roles | Platform | Complexity | Hours | Note |
|---|---|---|---|---|---|---:|---|
| **Mobile** | **Installable Mobile Experience (PWA)** | An installable, app-like experience on iOS and Android home screens, delivered through the web with no app store involvement. | Learner | Mobile | Medium | 20 | Low. |
|  | **Offline Capture Queue** | Capture evidence with no connectivity at all — photos and notes are held safely on the device and upload automatically once signal returns. | Learner | Mobile | High | 40 | The core technical challenge of this phase; evidence must never be lost when signal drops. |
|  | **Per-Criterion Camera Capture** | Capture directly from the camera against each named criterion, with on-screen guidance for exactly what to photograph. | Learner | Mobile | Medium | 24 | Low. |
|  | **Background Sync & Conflict Handling** | Reliable background uploading with retries, progress visibility, and correct handling when the same submission is touched on more than one device. | Learner | Both | High | 28 | Sync conflicts must never silently discard a trainee's work. |
| **QA** | **Real-Device Field Testing** | Test on real phones in realistic job-site conditions — poor signal, gloves, bright sunlight — and fix what that reveals. | Learner | Mobile | Medium | 16 | Low. |

**Done when**

- [ ] A trainee can capture a full evidence submission with no connectivity
- [ ] Queued evidence uploads automatically and visibly once signal returns
- [ ] Nothing is lost if the app is closed or the connection drops mid-upload
- [ ] Verified on real devices in realistic site conditions
