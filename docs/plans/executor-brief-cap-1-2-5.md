# Executor brief — `CAP-1`, `CAP-2`, `CAP-5` (WIOA upload-cap handling)

Written 2026-11-27 by the lead session. Plan context:
`docs/plans/notifications-and-upload-cap-kickoff.md`. Per `docs/DEV-APPROACH.md`, the lead writes
the brief and checks the result; the builder builds and ends with a "Not verified" list.

**Paste the block in "Handoff prompt" below into the executor session verbatim.** Everything the
executor needs is already on `stage` — this brief is not required reading for them, but the
acceptance criteria here are what their work will be checked against.

---

## Background

WIOA document slots have a lifetime cap of 10 uploads (`MAX_UPLOADS_PER_DOCUMENT`,
`src/lib/actions/wioa.ts:285`). Files are never deleted — a replaced file is archived to
`WioaDocumentVersion` so a rejected submission stays auditable — so uploads accumulate
permanently. An existing rate limit (20 per 15 min) bounds upload *speed* but not lifetime *count*;
the cap closes that second dimension.

**The cap logic is correct and is not being changed.** What is missing is everything after it
fires: the learner may never see the message, nothing is recorded, and nobody has ever confirmed
the cap works.

Two further tickets — a staff "Allow another upload" action and a follow-up-queue flag — depend on
notification work that does not exist yet. **Out of scope here.**

## Ticket detail

### `CAP-1` — make the refusal message actually reach the learner

`uploadWioaDocument` (`src/lib/actions/wioa.ts:288`) validates by throwing. Per `CLAUDE.md`'s
"Error handling convention" and `CLAUDE.local.md` #11, a thrown Server Action error on a page whose
component tree shape varies with its data can be silently replaced by a generic
`Minified React error #NNN`. `/learner/funding` is such a page — `DocumentCard`'s rendering varies
with `doc.status`, and `canUpload` is conditional — so this message is at risk of never being seen
in production.

Convert to `WioaActionResult` (`{ ok: true } | { ok: false; error: string }`) for **expected**
failures:

- the upload cap
- the rate limit (`enforceRateLimit`)

Keep `throw` for the ownership check (`'Not your document.'`) — it sits before the try and should
hit Next's error boundary. `advanceWioaEligibilityStatus` and `updateWioaFunding` in the same file
are already converted and are the pattern to follow.

Update the caller: `DocumentCard` in `src/app/learner/funding/WioaCaseFeed.tsx` (~lines 186–199)
checks `result.ok` instead of try/catch.

**Also change the learner-facing copy.** Current text reads as hitting a wall:

> "This document has already been uploaded 10 times, the most we allow. Contact your WIOA case
> manager if you need to submit a different file."

Replace with wording that reads as the process working, one sentence, **no mention of limits or
counts** — e.g. *"Let's get your case manager to look at this one — message them and they'll help
you upload a new file."* Rationale: decision 3 in the kickoff doc.

### `CAP-2` — record the event

When the cap refuses an upload, write one audit row before returning the error:

```ts
logAuditEvent({
  actor: <the learner's user id>,
  action: 'WIOA_DOCUMENT_UPLOAD_CAP_REACHED',
  targetType: 'WioaDocument',
  targetId: documentId,
  metadata: { masterCaseId, requirementId, totalUploads },
});
```

Existing helper, generic `AuditLog` table, **no migration**. Follow the call style in
`src/lib/actions/retention.ts`.

### `CAP-5` — prove the cap fires

**Do not verify this by hand.** A learner cannot upload twice in a row (`canUpload` is
`MISSING`/`REJECTED` only, and a successful upload sets `UPLOADED`), so reaching 10 manually
requires nine coordinator rejections across two accounts.

Write `tests/unit/wioa-upload-cap.test.ts`, following the setup/fixture pattern in
`tests/unit/wioa-status.test.ts`. Seed a `WioaDocument` plus 9 `WioaDocumentVersion` rows, then
call `uploadWioaDocument` and assert:

1. it returns `{ ok: false }` with the cap message
2. `uploadWioaDocumentFile` was **not** called — no storage object written. This is the entire
   reason the check runs before the upload; without this assertion the ordering could regress
   silently and leave orphaned files.
3. at 9 total uploads it still succeeds — an off-by-one in the boundary would otherwise be
   invisible

## Acceptance criteria

| Ticket | Accepted when |
| --- | --- |
| `CAP-1` | In a **production** build, a capped upload shows the new copy on `/learner/funding`, not `Minified React error`. Ownership failure still hits the error boundary. Rate-limit failure returns cleanly. |
| `CAP-2` | Triggering a refusal produces exactly one `AuditLog` row, learner as actor, `totalUploads` in metadata. |
| `CAP-5` | Test passes in CI against real Postgres; asserts the refusal, the boundary at 9, **and** that no storage write happened. |

## Environment traps that have cost real time on this repo

- **Verify `CAP-1` in a production build.** `next dev` does not minify and will not show the bug.
  `npm run build && npx next start`.
- **Stop the dev server before `npm run build`** (`CLAUDE.local.md` #2). Both write to `.next/`;
  building while dev is live corrupts `.next/dev/types/*` and produces `tsc` errors that look real
  and are not. Find it with `netstat -ano | grep ":3000" | grep LISTENING`, then `taskkill`.
- **No SDK clients at module scope** (`CLAUDE.local.md` #4). `new Resend(undefined)` throws at
  import time and takes down unrelated test files in CI, which have no `RESEND_API_KEY`.
- **No migration in these three tickets.** If you find yourself editing `schema.prisma`, stop —
  something has gone wrong with the scope.

## Expected "Not verified" list

The lead expects these to be listed as out of scope. Flag if they are missing:

- Whether a real learner can reach the cap through the UI — they cannot without staff rejections.
  That is `CAP-3`/`CAP-4`, not this PR.
- Whether other throw-based actions on data-dependent pages are still vulnerable.
  `assignWioaCasePartnerStaff` is known to be, named in `CLAUDE.local.md` #11, and is explicitly
  out of scope.
- Email and outreach paths, untouched.

## Handoff prompt

```
You are the builder for NFCAP LMS. I am the lead; I plan and QC, you build.
Read docs/HANDOFF.md, CLAUDE.md, and CLAUDE.local.md before starting.

Branch off origin/stage: fix/wioa-upload-cap-handling
Three tickets, in this order, one commit each, then ONE PR to `stage`.
No schema changes in any of them — do not create a migration.

Context: WIOA document slots have a lifetime cap of 10 uploads
(MAX_UPLOADS_PER_DOCUMENT, src/lib/actions/wioa.ts:285). The cap logic is
correct and is not changing. What's missing is that when it fires, the learner
may never see the message, nothing is recorded, and nobody has ever confirmed
it works. These three tickets fix that. Two further tickets (a staff action and
a follow-up-queue flag) depend on notification work that doesn't exist yet and
are NOT yours.

--- CAP-1: make the refusal message actually reach the learner ---

uploadWioaDocument (src/lib/actions/wioa.ts:288) validates by throwing. Per
CLAUDE.md's "Error handling convention" and CLAUDE.local.md #11, a thrown Server
Action error on a page whose tree shape varies with its data can be silently
replaced by a generic "Minified React error #NNN". /learner/funding is such a
page (DocumentCard's rendering varies with doc.status; canUpload is conditional),
so this message may never be seen in production.

Convert uploadWioaDocument to return WioaActionResult
({ ok: true } | { ok: false; error: string }) for EXPECTED failures:
  - the upload cap
  - the rate limit (enforceRateLimit)
Keep `throw` for the ownership check ('Not your document.') — it sits before the
try and should hit the error boundary. advanceWioaEligibilityStatus and
updateWioaFunding in the same file are already converted; follow them exactly.

Update the caller: DocumentCard in src/app/learner/funding/WioaCaseFeed.tsx
(~lines 186-199) checks result.ok instead of try/catch.

Also change the cap's learner-facing copy. The current text reads as hitting a
wall. Replace it with wording that reads as the process working — one sentence,
no mention of limits or counts, e.g.:
  "Let's get your case manager to look at this one — message them and they'll
   help you upload a new file."

VERIFY IN A PRODUCTION BUILD. `next dev` does not minify and will not show this
bug. Run `npm run build && npx next start`. Per CLAUDE.local.md #2, stop the dev
server first (netstat -ano | grep ":3000" | grep LISTENING, then taskkill) or
you will corrupt .next/ and chase phantom tsc errors.

--- CAP-2: record the event ---

When the cap refuses an upload, write one audit row before returning the error:
  logAuditEvent({
    actor: <the learner's user id>,
    action: 'WIOA_DOCUMENT_UPLOAD_CAP_REACHED',
    targetType: 'WioaDocument',
    targetId: documentId,
    metadata: { masterCaseId, requirementId, totalUploads },
  })
Existing helper, generic AuditLog table, no migration. Follow the call style in
src/lib/actions/retention.ts.

--- CAP-5: prove the cap fires ---

Do NOT verify this by hand. A learner cannot upload twice in a row (canUpload is
MISSING/REJECTED only, and a successful upload sets UPLOADED), so reaching 10
manually needs nine coordinator rejections across two accounts.

Write tests/unit/wioa-upload-cap.test.ts, following the setup/fixture pattern in
tests/unit/wioa-status.test.ts. Seed a WioaDocument plus 9 WioaDocumentVersion
rows, then call uploadWioaDocument and assert:
  1. it returns { ok: false } with the cap message
  2. uploadWioaDocumentFile was NOT called — no storage object written. This is
     the whole reason the check runs before the upload; without this assertion
     the ordering could regress silently and leave orphaned files.
  3. at 9 total uploads it still succeeds — an off-by-one would otherwise be
     invisible.

Note CLAUDE.local.md #4: construct SDK clients inside the function that uses
them, never at module scope, or you crash unrelated test files in CI.

--- Finishing ---

Run npm run format, npm run lint, npm run build, npm test.
Open ONE PR to stage, titled:
  "fix: WIOA upload cap — surface the refusal, log it, test it"
End your handoff with an explicit "Not verified" list.
Do NOT merge. The user does their own UI check first; CI green is not approval.
```
