-- Layer 1 — board-driven data-model design pass (docs/build/LAYER1_DATA_MODEL_DESIGN.md,
-- docs/plans/mockup-complete-build.md). Generated via `prisma migrate diff --from-schema
-- --to-schema` against the prior committed schema.prisma, not `migrate dev` — no local/shadow
-- database is available in this environment.
--
-- CORRECTED after a real incident: this file was committed alongside application code that
-- queries the new tables/columns (same commit, ffd9d36) WITHOUT ever running `prisma migrate
-- deploy` against the real project first — the original version of this comment said "UNAPPLIED,
-- run migrate deploy before Layer 3 depends on these tables," but Layer 1's own backend actions
-- (committed right after, same session) already depended on them immediately, not "Layer 3."
-- That shipped a live "Something went wrong" on /learner and other pages. Confirmed applied now
-- (`npx prisma migrate status` reports up to date; every table/column verified present by direct
-- query) — by whom or exactly when is unknown; it was not this session's `migrate deploy`, since
-- none was run. See CLAUDE.local.md's process-mistake log for the fix: `npm run predev` now runs
-- `prisma migrate status` and fails loudly on drift instead of silently shipping ahead of it.

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'LEARNERS', 'ADMIN', 'COORDINATOR', 'PARTNER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVIDENCE_REVIEWED', 'CASE_STATUS_CHANGED', 'MESSAGE_RECEIVED', 'ANNOUNCEMENT_PUBLISHED', 'DEADLINE_UPCOMING', 'COHORT_UPDATE');

-- CreateEnum
CREATE TYPE "ReadReceiptSubjectType" AS ENUM ('ANNOUNCEMENT', 'MESSAGE_THREAD');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "maxAttempts" INTEGER,
ADD COLUMN     "questionsPerAttempt" INTEGER,
ADD COLUMN     "randomizeOrder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "publicSlug" TEXT;

-- AlterTable
ALTER TABLE "LearnerProfile" ADD COLUMN     "portfolioShareToken" TEXT,
ADD COLUMN     "portfolioSharedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pathwayId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortMembership" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortDeadline" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CohortDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "createdBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThreadParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MessageThreadParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadReceipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectType" "ReadReceiptSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentSnapshot" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "completionPercent" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityQuestion" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[],
    "disqualifyingIndex" INTEGER,
    "order" INTEGER NOT NULL,

    CONSTRAINT "EligibilityQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityCheckResult" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT,
    "answers" JSONB NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilityCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cohort_pathwayId_idx" ON "Cohort"("pathwayId");

-- CreateIndex
CREATE INDEX "CohortMembership_learnerId_idx" ON "CohortMembership"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortMembership_cohortId_learnerId_key" ON "CohortMembership"("cohortId", "learnerId");

-- CreateIndex
CREATE INDEX "CohortDeadline_cohortId_dueDate_idx" ON "CohortDeadline"("cohortId", "dueDate");

-- CreateIndex
CREATE INDEX "Announcement_audience_publishedAt_idx" ON "Announcement"("audience", "publishedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "MessageThreadParticipant_userId_idx" ON "MessageThreadParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThreadParticipant_threadId_userId_key" ON "MessageThreadParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "Message_threadId_sentAt_idx" ON "Message"("threadId", "sentAt");

-- CreateIndex
CREATE INDEX "ReadReceipt_subjectType_subjectId_idx" ON "ReadReceipt"("subjectType", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadReceipt_userId_subjectType_subjectId_key" ON "ReadReceipt"("userId", "subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "EnrollmentSnapshot_enrollmentId_capturedAt_idx" ON "EnrollmentSnapshot"("enrollmentId", "capturedAt");

-- CreateIndex
CREATE INDEX "EligibilityQuestion_order_idx" ON "EligibilityQuestion"("order");

-- CreateIndex
CREATE INDEX "EligibilityCheckResult_learnerId_idx" ON "EligibilityCheckResult"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_publicSlug_key" ON "Certificate"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProfile_portfolioShareToken_key" ON "LearnerProfile"("portfolioShareToken");

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMembership" ADD CONSTRAINT "CohortMembership_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortDeadline" ADD CONSTRAINT "CohortDeadline_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThreadParticipant" ADD CONSTRAINT "MessageThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSnapshot" ADD CONSTRAINT "EnrollmentSnapshot_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------------------------
-- Row-Level Access Rules for Trainee <-> Staff Messaging (design doc decision #3). Mirrors
-- prisma/migrations/20261105120000_add_rls_wioa_pii's app_runtime/app_current_user_id/
-- app_current_role scaffolding (already applied) — only new helper + policies here.
--
-- Learned from the two WioaCase RLS bugs (20261117050000 recursion fix, 20261122165726 and
-- 20261122170153 self-reference fixes) BEFORE writing this, not after:
--   1. A helper that re-queries the table its own policy secures recurses unless SECURITY
--      DEFINER — app_can_access_thread is SECURITY DEFINER from the start.
--   2. A table's OWN row-security predicate must read that row's own columns directly, never
--      re-query itself, even via a SECURITY DEFINER helper (RETURNING/same-statement visibility,
--      not an RLS effect) — so MessageThreadParticipant's policy checks "userId" directly instead
--      of calling app_can_access_thread, which would otherwise query MessageThreadParticipant
--      from within MessageThreadParticipant's own policy.
--   3. Creating a thread happens before any participant row exists for it — split MessageThread's
--      INSERT from its SELECT/UPDATE/DELETE, same shape as WioaCase's fix, instead of repeating
--      the chicken-and-egg bug a third time.
--
-- Trade-off accepted: MessageThreadParticipant's own-column-only rule means a participant sees
-- only their OWN membership row, not co-participants' — "who else is in this thread" needs a
-- different data path (denormalize onto MessageThread, or widen later with a safe helper). Not
-- blocking Layer 1's schema; a Layer 3 concern when the Inbox UI is actually built.

CREATE OR REPLACE FUNCTION app_can_access_thread(target_thread_id text) RETURNS boolean AS $$
  SELECT
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR EXISTS (
      SELECT 1 FROM "MessageThreadParticipant" p
      WHERE p."threadId" = target_thread_id AND p."userId" = app_current_user_id()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE "MessageThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageThread" FORCE ROW LEVEL SECURITY;

CREATE POLICY message_thread_select ON "MessageThread"
  FOR SELECT
  USING (app_can_access_thread(id));

CREATE POLICY message_thread_update ON "MessageThread"
  FOR UPDATE
  USING (app_can_access_thread(id))
  WITH CHECK (app_can_access_thread(id));

CREATE POLICY message_thread_delete ON "MessageThread"
  FOR DELETE
  USING (app_can_access_thread(id));

-- No participant row exists yet at thread-creation time, so this can't require membership —
-- any authenticated app role may create a thread; the thread row itself carries no learner-
-- identifying data beyond an optional subject string.
CREATE POLICY message_thread_insert ON "MessageThread"
  FOR INSERT
  WITH CHECK (app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR', 'LEARNER', 'PARTNER_STAFF'));

ALTER TABLE "MessageThreadParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageThreadParticipant" FORCE ROW LEVEL SECURITY;
CREATE POLICY message_thread_participant_access ON "MessageThreadParticipant"
  USING (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "userId" = app_current_user_id()
  )
  WITH CHECK (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "userId" = app_current_user_id()
  );

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" FORCE ROW LEVEL SECURITY;
CREATE POLICY message_access ON "Message"
  USING (app_can_access_thread("threadId"))
  WITH CHECK (app_can_access_thread("threadId"));
