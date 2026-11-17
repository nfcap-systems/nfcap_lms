# No-SSN Rule & PII Boundary

Phase 1 feature (`docs/client/NFCAP_LMS_Feature_Detail_Client.md` line 40): *"Make it structurally
impossible for the system to store a Social Security Number, and document exactly which personal
information it does hold."*

## Structurally impossible — the field side

There is no field anywhere in `prisma/schema.prisma` for a Social Security Number, and never has
been. That half of the requirement was already true by omission; this feature makes it
enforceable rather than just currently-true.

**The gap wasn't a field — it was free text.** Several tables carry staff- or learner-authored
free text where an SSN could get pasted even with no dedicated field for it:
`EvidenceSubmission.description`, `WioaCommunication.subject`/`body`, `Appointment.notes`,
`WioaDocument.notes`/`rejectionReason`, `WioaDocumentVersion.rejectionReason`.

`prisma/migrations/20261105140000_no_ssn_check_constraints` adds a Postgres `CHECK` constraint on
each of those columns, rejecting the canonical SSN shape (`###-##-####`, with or without
separators, or nine bare digits, word-bounded so a 10-digit phone number doesn't false-positive).
`src/lib/pii.ts`'s `containsSsnPattern()` mirrors the same regex at the application layer (wired
into `submitEvidence`, `setWioaDocumentStatus`, and `advanceWioaCaseStatus`'s appointment notes in
`src/lib/actions/{progress,wioa}.ts`), so a rejected submission gets a clear validation message
instead of a raw constraint-violation error — but the DB constraint is the real backstop either
way.

**Known limitation:** this is a format check, not a semantic one. It can't catch an SSN typed with
unusual spacing, split across two fields, or described in prose ("my social is ..."). That's a
reasonable prototype-scope boundary, not a claim of perfect coverage.

## What the system actually holds — the PII map

| Where | What | Notes |
| --- | --- | --- |
| `LearnerProfile` | Address, city/state/zip, phone, date of birth, employment status, UI status, preferred language | Structured fields, queryable, RLS-scoped (docs/build/PHASE_1_DB_ACCESS_DECISION.md) |
| `WioaCase` + children | Case status, workforce board/AJCC/contact assignment, appointment schedule, staff notes | No direct PII fields beyond `learnerId`, but `Appointment.notes` is free text |
| `WioaDocument` / `WioaDocumentVersion` | **Uploaded identity-document files** — per `src/lib/supabase/wioa-storage.ts`'s own comment, this bucket holds "SSN cards, ID, EDD letters" | The actual SSN-bearing artifact in this system is a *file*, not a field — see "Open decision" below |
| `EvidenceSubmission` | Learner-written description of completed work, optional filename | Not WIOA-specific, but learner-authored free text |
| `AuditLog` | Actor id/role, action, target — not PII itself, but a record of who accessed what | Admin-only read (docs/build/PHASE_1_DB_ACCESS_DECISION.md) |

## Open decision — not mine to make

The client scope doc (`docs/client/NFCAP_LMS_Production_Scope_Summary_Client.md`, Phase 1 open
decisions table) flags this directly: *"The required-document list includes proof of a Social
Security number (card or W-2), which trainees would upload for staff review. The No-SSN rule says
the system must not store one. Decide: accept the upload with extra protection, accept a different
proof, or have the trainee show it to the board directly."*

Nothing in this pass resolves that — it's a program-policy call, not an engineering one. Today the
system does exactly the first option (accept the upload, store it in the private `wioa-documents`
bucket, never a public URL) because that's what the existing document-upload flow already does;
this feature's DB/app-layer guards reduce the *incidental* exposure (SSNs pasted into text fields)
without changing that underlying policy choice. If the client picks option 2 or 3, the document
requirement itself (`WioaDocumentRequirement`) and the upload flow would need to change — out of
scope for this pass.
