-- WIOA spec-alignment gap #1 (docs/plans/wioa-spec-alignment-kickoff.md) — the formal spec's
-- `wioa_cases` is a singular "Master student WIOA case" per learner; what's built today is one
-- `WioaCase` row per learner PER COURSE, with independent funding/status/document progress per
-- course that is real, working, in-use behavior (confirmed: the demo learner has a fully-approved
-- case for Tile Installation and no case at all for Trim Finishing, tracked independently) — not
-- something to collapse away. This migration keeps that per-course progress intact by renaming the
-- existing table to "WioaCourseCase" and introducing a new, genuinely per-learner "WioaCase"
-- (master) above it, holding only the fields that are actually learner-level: board/AJCC/contact
-- routing and Partner Staff assignment. Those fields stay denormalized on "WioaCourseCase" too
-- (every existing reader keeps working unchanged) but are henceforth written only through the
-- master case, by a new action that fans the value out to every course-case for that learner —
-- see src/lib/actions/wioa.ts's updateWioaCaseAssignment.
--
-- Verified safe before writing this: a read-only query against this same staging database found
-- only 2 WioaCase rows total, one learner with both, and zero disagreement between them on
-- board/contact/partner-staff — so the backfill below (picking one learner's existing values,
-- most-recently-updated first) loses nothing and resolves no real conflict.

-- 1. Rename the existing per-course table and its constraints/indexes so the name "WioaCase" is
--    free for the new master table. RLS (ENABLE/FORCE/policies) on this table carries over to the
--    new name automatically — Postgres moves policies with a table rename.
ALTER TABLE "WioaCase" RENAME TO "WioaCourseCase";

ALTER TABLE "WioaCourseCase" RENAME CONSTRAINT "WioaCase_pkey" TO "WioaCourseCase_pkey";
ALTER TABLE "WioaCourseCase" RENAME CONSTRAINT "WioaCase_courseId_fkey" TO "WioaCourseCase_courseId_fkey";
ALTER TABLE "WioaCourseCase" RENAME CONSTRAINT "WioaCase_workforceBoardId_fkey" TO "WioaCourseCase_workforceBoardId_fkey";
ALTER TABLE "WioaCourseCase" RENAME CONSTRAINT "WioaCase_ajccCenterId_fkey" TO "WioaCourseCase_ajccCenterId_fkey";
ALTER TABLE "WioaCourseCase" RENAME CONSTRAINT "WioaCase_contactId_fkey" TO "WioaCourseCase_contactId_fkey";
ALTER INDEX "WioaCase_learnerId_idx" RENAME TO "WioaCourseCase_learnerId_idx";
ALTER INDEX "WioaCase_courseId_idx" RENAME TO "WioaCourseCase_courseId_idx";
ALTER INDEX "WioaCase_workforceBoardId_idx" RENAME TO "WioaCourseCase_workforceBoardId_idx";

-- Same rename, for readability, on the RLS policies that now live on "WioaCourseCase" — purely
-- cosmetic (policy logic is unchanged, still reads this row's own learnerId/assignedPartnerStaffId
-- directly, no self-reference), but a policy named wioa_case_* actually governing
-- "WioaCourseCase" would be misleading the next time anyone reads this schema.
ALTER POLICY wioa_case_select ON "WioaCourseCase" RENAME TO wioa_course_case_select;
ALTER POLICY wioa_case_update ON "WioaCourseCase" RENAME TO wioa_course_case_update;
ALTER POLICY wioa_case_delete ON "WioaCourseCase" RENAME TO wioa_course_case_delete;
ALTER POLICY wioa_case_insert ON "WioaCourseCase" RENAME TO wioa_course_case_insert;

-- 2. app_can_access_case(target_case_id) is only ever called with a *course*-case id (it backs
--    WioaStatusHistory/Appointment/WioaDocument/WioaDocumentVersion/EtplFundingRequest/
--    FundingAuthorization, all keyed off the per-course case) — repoint its internal lookup at
--    "WioaCourseCase" now that "WioaCase" is about to mean something else. SECURITY DEFINER /
--    search_path carry over from prisma/migrations/20261117050000_fix_rls_helper_recursion;
--    CREATE OR REPLACE does not reset them.
CREATE OR REPLACE FUNCTION app_can_access_case(target_case_id text) RETURNS boolean AS $$
  SELECT
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR EXISTS (
      SELECT 1 FROM "WioaCourseCase" wc
      WHERE wc.id = target_case_id
        AND (wc."learnerId" = app_current_user_id() OR wc."assignedPartnerStaffId" = app_current_user_id())
    );
$$ LANGUAGE sql STABLE;

-- app_can_access_learner(target_learner_id) is deliberately left unchanged: after step 3 below,
-- "WioaCase" is the new master table, which also has learnerId/assignedPartnerStaffId — so this
-- function now checks "is this Partner Staff assigned to the learner's master case" instead of
-- "...to any one of their course-cases", which is the more correct question now that assignment
-- lives on the master. It stays correct precisely because updateWioaCaseAssignment keeps every
-- course-case's assignedPartnerStaffId in sync with its master case.

-- 3. Create the new master table.
CREATE TABLE "WioaCase" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "workforceBoardId" TEXT,
    "ajccCenterId" TEXT,
    "contactId" TEXT,
    "assignedPartnerStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WioaCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WioaCase_learnerId_key" ON "WioaCase"("learnerId");
CREATE INDEX "WioaCase_workforceBoardId_idx" ON "WioaCase"("workforceBoardId");

ALTER TABLE "WioaCase" ADD CONSTRAINT "WioaCase_workforceBoardId_fkey" FOREIGN KEY ("workforceBoardId") REFERENCES "WorkforceBoard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WioaCase" ADD CONSTRAINT "WioaCase_ajccCenterId_fkey" FOREIGN KEY ("ajccCenterId") REFERENCES "AjccCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WioaCase" ADD CONSTRAINT "WioaCase_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WorkforceContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. RLS on the new master table — same final-state shape as "WioaCourseCase" ended up with
--    (prisma/migrations/20261122170153_fix_wioa_case_select_self_reference), written directly
--    against its own columns from the start so it never has that migration's self-reference bug.
ALTER TABLE "WioaCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WioaCase" FORCE ROW LEVEL SECURITY;

CREATE POLICY wioa_case_select ON "WioaCase"
  FOR SELECT
  USING (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "learnerId" = app_current_user_id()
    OR "assignedPartnerStaffId" = app_current_user_id()
  );

CREATE POLICY wioa_case_insert ON "WioaCase"
  FOR INSERT
  WITH CHECK (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "learnerId" = app_current_user_id()
  );

CREATE POLICY wioa_case_update ON "WioaCase"
  FOR UPDATE
  USING (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "learnerId" = app_current_user_id()
    OR "assignedPartnerStaffId" = app_current_user_id()
  )
  WITH CHECK (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "learnerId" = app_current_user_id()
    OR "assignedPartnerStaffId" = app_current_user_id()
  );

CREATE POLICY wioa_case_delete ON "WioaCase"
  FOR DELETE
  USING (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "learnerId" = app_current_user_id()
    OR "assignedPartnerStaffId" = app_current_user_id()
  );

-- 5. Add the course-case -> master-case link, nullable first (expand step).
ALTER TABLE "WioaCourseCase" ADD COLUMN "masterCaseId" TEXT;

-- 6. Backfill: one master row per distinct learner who has any existing course-case, taking that
--    learner's most-recently-updated course-case's board/contact/partner-staff values (verified
--    above that no learner currently disagrees across their own course-cases, so "most recent"
--    vs. "any" is not a meaningful choice today — it's chosen only as the sane tiebreaker for any
--    future data that might).
INSERT INTO "WioaCase" ("id", "learnerId", "workforceBoardId", "ajccCenterId", "contactId", "assignedPartnerStaffId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  cc."learnerId",
  (ARRAY_AGG(cc."workforceBoardId" ORDER BY cc."updatedAt" DESC))[1],
  (ARRAY_AGG(cc."ajccCenterId" ORDER BY cc."updatedAt" DESC))[1],
  (ARRAY_AGG(cc."contactId" ORDER BY cc."updatedAt" DESC))[1],
  (ARRAY_AGG(cc."assignedPartnerStaffId" ORDER BY cc."updatedAt" DESC))[1],
  MIN(cc."createdAt"),
  NOW()
FROM "WioaCourseCase" cc
GROUP BY cc."learnerId";

UPDATE "WioaCourseCase" cc
SET "masterCaseId" = wc."id"
FROM "WioaCase" wc
WHERE wc."learnerId" = cc."learnerId";

-- 7. Contract: make the link mandatory and real, now that every existing row has one.
ALTER TABLE "WioaCourseCase" ALTER COLUMN "masterCaseId" SET NOT NULL;
ALTER TABLE "WioaCourseCase" ADD CONSTRAINT "WioaCourseCase_masterCaseId_fkey" FOREIGN KEY ("masterCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "WioaCourseCase_masterCaseId_idx" ON "WioaCourseCase"("masterCaseId");
