# Data Retention & Destruction Policy

Phase 1 feature (`docs/client/NFCAP_LMS_Feature_Detail_Client.md` line 41): *"Implement a defined
retention period for funding records and credentials, with automatic, logged destruction once it
expires... Retention periods are to be confirmed; held as configuration so they can change without
code."*

## What gets destroyed, and what doesn't

`src/lib/actions/retention.ts`'s `runDataRetentionSweep()` destroys the **uploaded document files**
(the identity documents — SSN cards, ID, EDD letters, per `docs/build/PHASE_1_PII_BOUNDARY.md`) for
any `WioaCase` that reached a terminal status (`CLOSED_INELIGIBLE` or
`APPRENTICESHIP_ENROLLMENT_COMPLETE`) more than the retention window ago, for both the current file
on `WioaDocument` and every superseded `WioaDocumentVersion`.

**Deliberately not destroyed:** the `WioaCase`/`WioaStatusHistory`/`WioaDocument` *rows* themselves
— only their file content and notes. Deleting the case history outright would erase exactly the
compliance record the Platform-Wide Audit Trail feature exists to keep; "destruction" here means
the sensitive document content, not the fact that a case happened. If the real policy intends
full-case deletion rather than file-content destruction, that's a different (bigger) feature than
what's built here, and the client scope doc's own wording ("funding records and credentials")
reads more naturally as the documents than the case metadata — but this is a judgment call worth
confirming, not a settled one.

Every individual document/version destroyed gets its own `AuditLog` row
(`DATA_RETENTION_DESTROY_DOCUMENT[_VERSION]`), not just a batch summary — so the audit trail stays
a real record of what was destroyed and when, visible at `/admin/audit`.

## Retention period — placeholder, pending sign-off

`DATA_RETENTION_MONTHS` (env var, default `36` if unset) controls the window. **36 is a
placeholder**, not an agreed number — the client scope doc explicitly defers this, and nothing in
this pass picks a real value. Change the env var, not the code, once it's decided.

## How it runs

- `src/app/api/cron/data-retention/route.ts` — a `POST` endpoint authenticated by `CRON_SECRET`
  (not a Supabase session; there isn't one for a scheduled job). `src/proxy.ts` has an explicit
  carve-out for `/api/cron/*` so the session-based 401 doesn't block it before its own check runs.
- `.github/workflows/data-retention.yml` — calls that endpoint daily via `curl`, using
  `secrets.APP_URL` and `secrets.CRON_SECRET` (set these in the repo's GitHub Actions secrets —
  not done as part of this pass, since it's a deploy-environment credential, not a code change).

## Not done in this pass

- `CRON_SECRET` and `DATA_RETENTION_MONTHS` need real values set wherever the app actually runs
  (`.env` in production, GitHub Actions secrets for the workflow) — `.env.example` documents the
  placeholders only.
- No learner-facing or staff-facing UI shows "this document will be destroyed on \<date\>" — the
  client scope doc's feature description doesn't ask for one, but it's worth flagging as a UX gap
  if retention destruction should be visible to the people it affects.
