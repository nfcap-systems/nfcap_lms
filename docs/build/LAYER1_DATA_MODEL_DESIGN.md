# Layer 1 — data-model design pass

Written 2026-11-24, per `docs/plans/mockup-complete-build.md`'s Layer 1. One design pass covering
every model the board-driven plan implies that `prisma/schema.prisma` lacked at the time of
writing, designed together and reviewed once rather than grown board-by-board. Built directly
after the design pass in the same sitting (user decision, 2026-11-24: continue through all layers
without a branch/PR per layer; push, commit and merge only once everything is done) — so unlike
the plan's original two-step (doc reviewed, then migration), the migration set in this document
was authored immediately after it rather than waiting for a separate review gate. Flag this
deviation before the final push.

## Cross-cutting decisions

### 1. Read-state pattern

Three things need per-user read/unread: `Notification`, `Announcement`, `Message`. They don't
need the *same* table, because they aren't the same shape:

- **`Notification` is already 1:1 with its recipient** — one row exists per user per event, so its
  own `readAt` column is the read-state. No join table needed.
- **`Announcement` and `Message` are broadcast/shared** — one `Announcement` or `Message` row is
  read by many different users, each independently. These two share one generic table,
  `ReadReceipt(userId, subjectType, subjectId, readAt)`, keyed by `(userId, subjectType,
  subjectId)`. This is the "one shared pattern" the plan's rule asks for — it unifies the two
  shapes that are actually alike and leaves `Notification` alone rather than forcing a third
  consumer onto a polymorphic table it doesn't need.

### 2. `CriterionEvidenceFile` design — moot

Already solved on `stage`: the evidence grain is per-criterion via `CriterionAssessment`'s
learner-capture fields (PRs #20/#21). Nothing to design here. Read
`20261123120000_add_criterion_capture_and_annotation` and
`20261123150000_add_criterion_carried_forward` before touching anything evidence-adjacent.

### 3. RLS policies for every new model

Checked the existing convention first (`prisma/migrations/20261105120000_add_rls_wioa_pii` is the
only migration that calls `ENABLE ROW LEVEL SECURITY`/`CREATE POLICY` outside the one recursion
fix) — **Postgres RLS in this codebase is reserved for WIOA PII**, not applied to every table.
Course content, evidence, enrollments, certificates — all app-level-authorized in
`src/lib/actions/*`/`src/lib/data/*`, no Postgres RLS. Layer 1's new models follow the same split:

- **`MessageThread`/`MessageThreadParticipant`/`Message` get Postgres RLS**, via
  `src/lib/db/rls.ts`'s `withRlsContext`, because a trainee↔staff message is as sensitive as a
  WIOA communication and app-level checks alone were exactly the gap Phase 1 closed for WIOA data.
  Designed this time by applying what the three WioaCase RLS bugs already paid for, instead of
  rediscovering them:
  - `app_can_access_thread(threadId)` queries `MessageThreadParticipant` (a different table from
    `MessageThread`/`Message`) — safe, same shape as `app_can_access_case` being queried by
    `WioaStatusHistory`/`Appointment`/etc. Declared `SECURITY DEFINER` from the start (the
    recursion-fix lesson from `20261117050000`), not retrofitted after a stack-depth error.
  - `MessageThreadParticipant`'s own policy does **not** call `app_can_access_thread` — that would
    be the table re-querying itself from inside its own policy, the exact self-reference class
    fixed for `WioaCase` in `20261122170153`. It reads its own `userId` column directly instead.
    **Trade-off accepted**: a participant sees only their own membership row, not
    co-participants' — "who else is in this thread" needs a different data path later (Layer 3
    concern, not a Layer 1 schema gap).
  - `MessageThread`'s `INSERT` policy is split from its `SELECT`/`UPDATE`/`DELETE` policies,
    because no `MessageThreadParticipant` row exists yet at thread-creation time — the same
    chicken-and-egg bug `20261122165726` fixed for `WioaCase`'s own insert, not repeated a third
    time. Insert just checks the caller has *some* valid app role; the thread row carries no
    learner-identifying data beyond an optional subject string.
- **Everything else in this pass — `Cohort`, `CohortMembership`, `CohortDeadline`,
  `Announcement`, `Notification`, `ReadReceipt`, `EnrollmentSnapshot`, `EligibilityQuestion`,
  `EligibilityCheckResult`, `PortfolioShare` (a field, not a model) — stays app-level-authorized**,
  consistent with Course/Evidence. None of these carry data more sensitive than course/evidence
  data already does.
- **Stalled-case detection gets no new RLS surface** because it's computed, not stored (see #5).

### 4. Audit entries for every new mutating action

No schema change — `AuditLog` is already generic (`actorId`/`actorRole`/`action`/`targetType`/
`targetId`/`metadata`). This is a code-level convention for whoever builds the actions in Layer 3
(cohort create/edit, announcement publish, notification dispatch, message send) — noted here so
it isn't missed, not implemented in this pass since no server actions exist yet for these models.

### 5. Stalled-case rule — decided: computed, not stored

A `WioaCase` is "stalled" as a function of `status` + `WioaStatusHistory`'s most recent transition
timestamp (e.g., no status change in N days while not in a terminal status) — entirely derivable
from existing data. Storing it would mean either a background job keeping a flag in sync (new
failure mode, no existing job infra for it) or a stored flag that's wrong the instant time passes
without a write. Computed at query time in `CRD05-StalledCases`'s data loader instead. No schema
change.

### 6. Performance conventions

Apply to whoever builds Layer 3's actions/queries against these models (`CLAUDE.md`): no
`force-dynamic`, a `loading.tsx` per new route segment, narrowest `select`, no per-entity loops,
`'use client'` at the leaves, nothing but DB writes inside `$transaction`. Indexes below are placed
with the known read patterns in mind (per-user notification/announcement feeds, per-thread message
lists, per-cohort rosters).

### 7. Media delivery — still undecided, not blocking

Cloudflare Stream vs Mux stays open (scope doc places this decision in Phase 3). No schema in this
pass depends on it; none of the new models store video.

## New models

### Cohorts & deadlines (scope: Cohorts & Deadlines, Phase 6, 24h)

```prisma
model Cohort {
  id        String    @id @default(cuid())
  name      String
  pathwayId String?
  pathway   Pathway?  @relation(fields: [pathwayId], references: [id])
  startDate DateTime
  endDate   DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  memberships CohortMembership[]
  deadlines   CohortDeadline[]

  @@index([pathwayId])
}

/// learnerId is a Supabase auth.users.id, same app-enforced-FK convention as Enrollment.learnerId.
model CohortMembership {
  id       String   @id @default(cuid())
  cohortId String
  cohort   Cohort   @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  learnerId String
  joinedAt DateTime @default(now())

  @@unique([cohortId, learnerId])
  @@index([learnerId])
}

model CohortDeadline {
  id       String   @id @default(cuid())
  cohortId String
  cohort   Cohort   @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  label    String
  dueDate  DateTime

  @@index([cohortId, dueDate])
}
```

`Cohort.pathwayId` is nullable — a cohort need not be scoped to one pathway, matching the client's
still-open "how does NFCAP actually run intakes" question (not forcing a model answer onto an
unresolved client decision).

### Announcements (scope: Announcements, Phase 6, 14h)

```prisma
enum AnnouncementAudience {
  ALL
  LEARNERS
  ADMIN
  COORDINATOR
  PARTNER
}

model Announcement {
  id         String               @id @default(cuid())
  title      String
  body       String
  audience   AnnouncementAudience @default(ALL)
  createdBy  String
  publishedAt DateTime            @default(now())
  expiresAt  DateTime?

  @@index([audience, publishedAt])
}
```

Read state via the shared `ReadReceipt` table (decision #1), `subjectType = 'ANNOUNCEMENT'`.

### Notifications (scope: Notification Coverage Completion, Phase 6, 18h)

```prisma
enum NotificationType {
  EVIDENCE_REVIEWED
  CASE_STATUS_CHANGED
  MESSAGE_RECEIVED
  ANNOUNCEMENT_PUBLISHED
  DEADLINE_UPCOMING
  COHORT_UPDATE
}

/// One row per recipient per event — not broadcast, so readAt lives directly on this row (decision #1).
model Notification {
  id         String           @id @default(cuid())
  userId     String
  type       NotificationType
  title      String
  body       String
  link       String?
  metadata   Json?
  readAt     DateTime?
  createdAt  DateTime         @default(now())

  @@index([userId, createdAt])
  @@index([userId, readAt])
}
```

### Messaging (scope: Trainee ↔ Staff Messaging, Phase 6, 36h)

```prisma
model MessageThread {
  id        String    @id @default(cuid())
  subject   String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  participants MessageThreadParticipant[]
  messages     Message[]
}

/// userId is a Supabase auth.users.id (learner or staff) — app-enforced FK, same convention as
/// Enrollment.learnerId. This table is what the RLS helper function checks (decision #3).
model MessageThreadParticipant {
  id       String        @id @default(cuid())
  threadId String
  thread   MessageThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  userId   String

  @@unique([threadId, userId])
  @@index([userId])
}

model Message {
  id        String        @id @default(cuid())
  threadId  String
  thread    MessageThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  senderId  String
  body      String
  sentAt    DateTime      @default(now())

  @@index([threadId, sentAt])
}
```

Read state via `ReadReceipt`, `subjectType = 'MESSAGE_THREAD'`, `subjectId = threadId` — read
status is per-thread, not per-message (matches `ADM26-Inbox`'s per-conversation unread count, not
a per-message read marker).

### Shared read-receipt table (decision #1)

```prisma
enum ReadReceiptSubjectType {
  ANNOUNCEMENT
  MESSAGE_THREAD
}

model ReadReceipt {
  id          String                  @id @default(cuid())
  userId      String
  subjectType ReadReceiptSubjectType
  subjectId   String
  readAt      DateTime                @default(now())

  @@unique([userId, subjectType, subjectId])
  @@index([subjectType, subjectId])
}
```

### Admin reporting depth (scope: Admin Reporting Depth, Phase 6, 28h)

Learner activity timestamp: **no new field** — `CompletedLesson.completedAt` already exists and is
exactly this (per the plan's own note). `ADM03`'s three-tier `.av-dot` and `ADM02`'s Recent
Learners read off the max `completedAt` across a learner's completions; no schema change.

Point-in-time status history / trend badges:

```prisma
model EnrollmentSnapshot {
  id               String     @id @default(cuid())
  enrollmentId     String
  enrollment       Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  completionPercent Float
  capturedAt       DateTime   @default(now())

  @@index([enrollmentId, capturedAt])
}
```

One row per enrollment per capture (a periodic job, not built in this pass — Layer 1 is schema
only). `ADM02`'s trend badges and `RPT01`'s trends compare the latest snapshot to the prior one.

### Credential public verification (scope: Public Verification Page + QR, Phase 4, 20h)

A field, not a model — added to the existing `Certificate`:

```prisma
// on Certificate:
publicSlug String? @unique
```

Nullable so every certificate issued before this field exists behaves exactly as before (same
pattern as `EvidenceSubmission.filePath` being nullable for pre-existing rows). Populated at issue
time going forward; backfill for existing certificates is a Layer 3 concern, not this migration's.

### Shareable portfolio (scope: Shareable Verified Portfolio, Phase 4, 18h)

A field on `LearnerProfile`, not a new model — one active share link per learner is what
`LRN07`'s "Share your portfolio" panel draws:

```prisma
// on LearnerProfile:
portfolioShareToken String?   @unique
portfolioSharedAt   DateTime?
```

`portfolioSharedAt` null means never shared/revoked; set together with the token when the learner
turns sharing on, cleared (both to null) when they revoke it.

### Eligibility self-check (scope: Eligibility Self-Check, Phase 5, 20h)

```prisma
model EligibilityQuestion {
  id      String @id @default(cuid())
  prompt  String
  options String[]
  /// Index into `options` that counts as a disqualifying answer, or null if every answer passes.
  disqualifyingIndex Int?
  order   Int

  @@index([order])
}

/// learnerId nullable — LRN10b is a pre-screening self-check, reachable before signup.
model EligibilityCheckResult {
  id        String   @id @default(cuid())
  learnerId String?
  answers   Json
  eligible  Boolean
  createdAt DateTime @default(now())

  @@index([learnerId])
}
```

### Quiz engine depth (scope: Quiz Engine Depth, Phase 6, 32h)

No new models — extends `Assessment` rather than introducing a separate `QuestionBank` model.
`LRN05`/`05b`/`05c` ask for more questions in the pool than shown per attempt, randomized order,
and an attempt cap — all expressible as pool-size/ordering semantics on the existing
`Assessment`/`QuizQuestion` pair, which is less migration risk than a parallel bank concept that
`QuizAttempt` would then also need to reference:

```prisma
// on Assessment:
questionsPerAttempt Int?     // null = show every question (today's behavior, unchanged)
randomizeOrder       Boolean @default(false)
maxAttempts          Int?    // null = unlimited (today's behavior, unchanged)
```

Every existing `Assessment` row gets `questionsPerAttempt = null`, `randomizeOrder = false`,
`maxAttempts = null` by default — identical behavior to today until a course's assessment is
explicitly configured otherwise.

## Not designed in this pass

- **`CRD05` stalled-case rule's actual threshold** (how many days = stalled) is a product/client
  decision, not a schema one — the rule being computed-not-stored (decision #5) means this can be
  tuned later with zero migration cost.
- **Cohort intake model** (how NFCAP actually runs intakes) stays an open client question; `Cohort`
  above is deliberately unopinionated about it (nullable pathway, no intake-cycle concept forced
  in).
- **`SET01-AdminSettings`'s actual content** — still no product decision, so nothing here backs it.
