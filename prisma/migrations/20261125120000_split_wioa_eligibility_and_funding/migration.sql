-- WIOA spec-alignment gap #1, full split (docs/plans/wioa-spec-alignment-kickoff.md #1).
-- The first pass (20261125100000_split_wioa_case_master_and_course) only pulled board/AJCC/
-- contact/Partner-Staff-assignment up to the master WioaCase. This migration does the rest: the
-- spec's eligibility pipeline (Section 7 steps 1-13), the document checklist, and
-- orientation/intake appointments all move to the master case too, since the spec treats
-- eligibility as a one-time-per-student determination, separate from per-course funding/tuition
-- approval (spec Section 14: "WIOA eligibility and training funding approval must be separate
-- states"). WioaCourseCase shrinks to just the funding pipeline (ETPL_TRAINING_REQUESTED onward).
--
-- The live learner data this applies to (verified by direct query before writing this) has real
-- duplicate eligibility progress across two course-cases for the same learner — exactly the shape
-- problem this split exists to fix: Tile Installation's course-case walked the full eligibility
-- pipeline to WIOA_ELIGIBLE (real accepted documents, real status history) and went on to get
-- funded; Flooring Fundamentals' course-case only ever reached INITIAL_CONTACT_SENT (a second,
-- redundant, far-less-complete eligibility attempt for the same learner, all 4 documents still
-- MISSING). The logic below is written generically (by status progress, not hardcoded row ids) so
-- it behaves correctly for any learner in this shape, not just this one: for each learner, the
-- course-case whose eligibility history reached furthest is canonical and donates its eligibility
-- data to the master; every other course-case's eligibility-only data is discarded as redundant,
-- and the course-case itself is deleted if it never reached real funding-stage progress (no
-- EtplFundingRequest, status never past WIOA_ELIGIBLE) — exactly what "a course-case shouldn't
-- exist until funding is actually requested" means for already-live data.
--
-- Ordering matters throughout: every old wioaCaseId foreign key pointing at WioaCourseCase is
-- detached (constraint dropped) from the tables that moved to the master BEFORE any
-- WioaCourseCase row is deleted, specifically so a cascade delete can never destroy the
-- eligibility data this migration just finished moving onto the master case.

-- 1. New enums for the split pipelines.
CREATE TYPE "WioaEligibilityStatus" AS ENUM ('REGISTERED', 'WORKFORCE_BOARD_MATCHED', 'INITIAL_CONTACT_SENT', 'AWAITING_RESPONSE', 'ORIENTATION_SCHEDULED', 'ORIENTATION_COMPLETED', 'CALJOBS_COMPLETED', 'WIOA_APPLICATION_SUBMITTED', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED', 'INTAKE_APPOINTMENT_SCHEDULED', 'ELIGIBILITY_UNDER_REVIEW', 'WIOA_ELIGIBLE', 'CLOSED_INELIGIBLE');
CREATE TYPE "WioaFundingStatus" AS ENUM ('ETPL_TRAINING_REQUESTED', 'TRAINING_AUTHORIZATION_PENDING', 'TUITION_APPROVED', 'APPRENTICESHIP_ENROLLMENT_COMPLETE', 'FUNDING_DECLINED');

-- 2. WioaCase gets its new columns first — the data movement below writes into them.
ALTER TABLE "WioaCase" ADD COLUMN "status" "WioaEligibilityStatus" NOT NULL DEFAULT 'REGISTERED';
ALTER TABLE "WioaCase" ADD COLUMN "closedAt" TIMESTAMP(3);

-- RLS helper functions are redefined here, early, so every policy swap below (each done
-- immediately before the old `wioaCaseId` column it depended on is dropped, since Postgres won't
-- drop a column a policy still references) can call the new function straight away.
-- app_can_access_case(id) was written for "a course-case id" (WioaStatusHistory/Appointment/
-- WioaDocument/EtplFundingRequest/FundingAuthorization all used it that way); now that
-- WioaStatusHistory/Appointment/WioaDocument key off the MASTER case instead, its body is
-- retargeted through WioaCourseCase -> WioaCase so it still means "can access this course-case"
-- for the tables that still use it (EtplFundingRequest/FundingAuthorization, and the new
-- WioaFundingStatusHistory) — its name and call sites in those tables' policies don't need to
-- change. A new app_can_access_master_case(id) covers the tables that moved to the master.
CREATE OR REPLACE FUNCTION app_can_access_case(target_case_id text) RETURNS boolean AS $$
  SELECT
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR EXISTS (
      SELECT 1 FROM "WioaCourseCase" cc
      JOIN "WioaCase" wc ON wc.id = cc."masterCaseId"
      WHERE cc.id = target_case_id
        AND (wc."learnerId" = app_current_user_id() OR wc."assignedPartnerStaffId" = app_current_user_id())
    );
$$ LANGUAGE sql STABLE;
ALTER FUNCTION app_can_access_case(text) SECURITY DEFINER;
ALTER FUNCTION app_can_access_case(text) SET search_path = public;

CREATE FUNCTION app_can_access_master_case(target_case_id text) RETURNS boolean AS $$
  SELECT
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR EXISTS (
      SELECT 1 FROM "WioaCase" wc
      WHERE wc.id = target_case_id
        AND (wc."learnerId" = app_current_user_id() OR wc."assignedPartnerStaffId" = app_current_user_id())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- A rank table for the old WioaCaseStatus order, used only by this migration's data movement to
-- find each learner's "furthest progressed" course-case and to split each status into its new
-- eligibility-or-funding home. Dropped at the end.
CREATE TEMP TABLE _old_status_rank (status text, rank int, is_eligibility boolean);
INSERT INTO _old_status_rank (status, rank, is_eligibility) VALUES
  ('REGISTERED', 1, true),
  ('WORKFORCE_BOARD_MATCHED', 2, true),
  ('INITIAL_CONTACT_SENT', 3, true),
  ('AWAITING_RESPONSE', 4, true),
  ('ORIENTATION_SCHEDULED', 5, true),
  ('ORIENTATION_COMPLETED', 6, true),
  ('CALJOBS_COMPLETED', 7, true),
  ('WIOA_APPLICATION_SUBMITTED', 8, true),
  ('DOCUMENTS_PENDING', 9, true),
  ('DOCUMENTS_SUBMITTED', 10, true),
  ('INTAKE_APPOINTMENT_SCHEDULED', 11, true),
  ('ELIGIBILITY_UNDER_REVIEW', 12, true),
  ('WIOA_ELIGIBLE', 13, true),
  ('ETPL_TRAINING_REQUESTED', 14, false),
  ('TRAINING_AUTHORIZATION_PENDING', 15, false),
  ('TUITION_APPROVED', 16, false),
  ('APPRENTICESHIP_ENROLLMENT_COMPLETE', 17, false),
  ('CLOSED_INELIGIBLE', 18, true);

-- For each learner, the canonical course-case is the one whose furthest-ever status (by rank) is
-- highest; ties broken by most-recently-updated. Its id becomes that learner's "eligibility
-- donor."
CREATE TEMP TABLE _canonical_course_case AS
SELECT DISTINCT ON (cc."learnerId")
  cc."learnerId",
  cc.id AS course_case_id,
  cc."masterCaseId"
FROM "WioaCourseCase" cc
ORDER BY cc."learnerId", (SELECT rank FROM _old_status_rank WHERE status = cc.status::text) DESC, cc."updatedAt" DESC;

-- 3. WioaStatusHistory: move the canonical course-case's eligibility-range rows to the master,
--    copy its funding-range rows into the new WioaFundingStatusHistory table, then drop everything
--    that isn't an eligibility row now tagged with a masterCaseId (both the funding rows, already
--    copied, and every non-canonical course-case's redundant eligibility rows).
ALTER TABLE "WioaStatusHistory" ADD COLUMN "masterCaseId" TEXT;

UPDATE "WioaStatusHistory" sh
SET "masterCaseId" = cc."masterCaseId"
FROM _canonical_course_case cc, _old_status_rank r
WHERE sh."wioaCaseId" = cc.course_case_id
  AND r.status = sh.status::text
  AND r.is_eligibility;

-- Derived from the canonical course-case's STATUS HISTORY (the highest-ranked eligibility entry
-- it ever passed through), not its current `status` column — Tile Installation's current status
-- is already TUITION_APPROVED (funding range) by the time this runs, so reading `status` directly
-- would miss that it passed through WIOA_ELIGIBLE on the way there.
UPDATE "WioaCase" wc
SET
  status = sub.status::"WioaEligibilityStatus",
  "closedAt" = CASE WHEN sub.status = 'CLOSED_INELIGIBLE' THEN now() ELSE wc."closedAt" END
FROM (
  SELECT DISTINCT ON (sh."masterCaseId")
    sh."masterCaseId",
    sh.status::text AS status
  FROM "WioaStatusHistory" sh
  JOIN _old_status_rank r ON r.status = sh.status::text
  WHERE sh."masterCaseId" IS NOT NULL
  ORDER BY sh."masterCaseId", r.rank DESC
) sub
WHERE wc.id = sub."masterCaseId";

CREATE TABLE "WioaFundingStatusHistory" (
    "id" TEXT NOT NULL,
    "courseCaseId" TEXT NOT NULL,
    "status" "WioaFundingStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,

    CONSTRAINT "WioaFundingStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WioaFundingStatusHistory_courseCaseId_changedAt_idx" ON "WioaFundingStatusHistory"("courseCaseId", "changedAt");
ALTER TABLE "WioaFundingStatusHistory" ADD CONSTRAINT "WioaFundingStatusHistory_courseCaseId_fkey" FOREIGN KEY ("courseCaseId") REFERENCES "WioaCourseCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "WioaFundingStatusHistory" (id, "courseCaseId", status, "changedAt", "changedBy")
SELECT sh.id, sh."wioaCaseId", sh.status::text::"WioaFundingStatus", sh."changedAt", sh."changedBy"
FROM "WioaStatusHistory" sh
JOIN _old_status_rank r ON r.status = sh.status::text
WHERE NOT r.is_eligibility;

DELETE FROM "WioaStatusHistory" WHERE "masterCaseId" IS NULL;

-- The existing policy's USING/WITH CHECK reference "wioaCaseId" directly (via app_can_access_case),
-- so it must be swapped before that column can be dropped.
DROP POLICY wioa_status_history_access ON "WioaStatusHistory";
CREATE POLICY wioa_status_history_access ON "WioaStatusHistory"
  USING (app_can_access_master_case("masterCaseId"))
  WITH CHECK (app_can_access_master_case("masterCaseId"));

-- Detach the old FK now (before any WioaCourseCase row can be deleted later in this migration) and
-- finish converting the column.
ALTER TABLE "WioaStatusHistory" DROP CONSTRAINT "WioaStatusHistory_wioaCaseId_fkey";
ALTER TABLE "WioaStatusHistory" DROP COLUMN "wioaCaseId";
ALTER TABLE "WioaStatusHistory" ALTER COLUMN "masterCaseId" SET NOT NULL;
ALTER TABLE "WioaStatusHistory" ALTER COLUMN "status" TYPE "WioaEligibilityStatus" USING "status"::text::"WioaEligibilityStatus";
ALTER TABLE "WioaStatusHistory" ADD CONSTRAINT "WioaStatusHistory_masterCaseId_fkey" FOREIGN KEY ("masterCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "WioaStatusHistory_masterCaseId_changedAt_idx" ON "WioaStatusHistory"("masterCaseId", "changedAt");

-- 4. WioaDocument: move the canonical course-case's documents to the master, drop the rest
--    (redundant checklists from non-canonical course-cases), then detach the old FK before any
--    WioaCourseCase row can be deleted.
ALTER TABLE "WioaDocument" ADD COLUMN "masterCaseId" TEXT;
UPDATE "WioaDocument" d
SET "masterCaseId" = cc."masterCaseId"
FROM _canonical_course_case cc
WHERE d."wioaCaseId" = cc.course_case_id;
DELETE FROM "WioaDocument" WHERE "masterCaseId" IS NULL;

-- Both policies' USING/WITH CHECK reference "wioaCaseId" (WioaDocumentVersion's indirectly, via
-- its own EXISTS over WioaDocument), so both must swap before that column can be dropped.
DROP POLICY wioa_document_access ON "WioaDocument";
CREATE POLICY wioa_document_access ON "WioaDocument"
  USING (app_can_access_master_case("masterCaseId"))
  WITH CHECK (app_can_access_master_case("masterCaseId"));

DROP POLICY wioa_document_version_access ON "WioaDocumentVersion";
CREATE POLICY wioa_document_version_access ON "WioaDocumentVersion"
  USING (
    EXISTS (
      SELECT 1 FROM "WioaDocument" d
      WHERE d.id = "documentId" AND app_can_access_master_case(d."masterCaseId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "WioaDocument" d
      WHERE d.id = "documentId" AND app_can_access_master_case(d."masterCaseId")
    )
  );

ALTER TABLE "WioaDocument" DROP CONSTRAINT "WioaDocument_wioaCaseId_fkey";
DROP INDEX "WioaDocument_wioaCaseId_requirementId_key";
DROP INDEX "WioaDocument_wioaCaseId_idx";
ALTER TABLE "WioaDocument" DROP COLUMN "wioaCaseId";
ALTER TABLE "WioaDocument" ALTER COLUMN "masterCaseId" SET NOT NULL;
ALTER TABLE "WioaDocument" ADD CONSTRAINT "WioaDocument_masterCaseId_fkey" FOREIGN KEY ("masterCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "WioaDocument_masterCaseId_requirementId_key" ON "WioaDocument"("masterCaseId", "requirementId");
CREATE INDEX "WioaDocument_masterCaseId_idx" ON "WioaDocument"("masterCaseId");

-- 5. Appointment: same pattern — the canonical course-case's appointments move to the master, tagged
--    with courseCaseId too (a FOLLOWUP appointment can legitimately be about that course's funding
--    progress specifically); everything else is dropped; old FK detached before any
--    WioaCourseCase row can be deleted.
ALTER TABLE "Appointment" ADD COLUMN "masterCaseId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "courseCaseId" TEXT;
UPDATE "Appointment" a
SET "masterCaseId" = cc."masterCaseId", "courseCaseId" = a."wioaCaseId"
FROM _canonical_course_case cc
WHERE a."wioaCaseId" = cc.course_case_id;
DELETE FROM "Appointment" WHERE "masterCaseId" IS NULL;

DROP POLICY appointment_access ON "Appointment";
CREATE POLICY appointment_access ON "Appointment"
  USING (app_can_access_master_case("masterCaseId"))
  WITH CHECK (app_can_access_master_case("masterCaseId"));

ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_wioaCaseId_fkey";
ALTER TABLE "Appointment" DROP COLUMN "wioaCaseId";
ALTER TABLE "Appointment" ALTER COLUMN "masterCaseId" SET NOT NULL;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_masterCaseId_fkey" FOREIGN KEY ("masterCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- SET NULL, not CASCADE: courseCaseId is just an optional tag; losing the course-case it tagged
-- (e.g. step 7 below deleting a never-funded one) must never delete the appointment itself, which
-- is owned by masterCaseId and may already have been migrated there specifically to survive this.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_courseCaseId_fkey" FOREIGN KEY ("courseCaseId") REFERENCES "WioaCourseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Appointment_masterCaseId_idx" ON "Appointment"("masterCaseId");
CREATE INDEX "Appointment_courseCaseId_idx" ON "Appointment"("courseCaseId");

-- 6. WioaCommunication: always gets a masterCaseId; keeps courseCaseId/courseId only when the
--    communication is genuinely about a specific course (the canonical course-case's own
--    communications, e.g. a funding-approval notice). A non-canonical course-case's communications
--    (e.g. the literal outreach email, if that's the one that happened to be sent in the
--    non-canonical course's context) are real and kept too, reattached to the master with no
--    course context, since the outreach was about starting the eligibility process, not about
--    that specific course. This FK was already ON DELETE SET NULL (not CASCADE), so unlike the
--    three tables above, ordering relative to WioaCourseCase deletion isn't a correctness risk
--    here — detached anyway, for consistency.
ALTER TABLE "WioaCommunication" ADD COLUMN "masterCaseId" TEXT;
ALTER TABLE "WioaCommunication" ADD COLUMN "courseCaseId" TEXT;
ALTER TABLE "WioaCommunication" ALTER COLUMN "courseId" DROP NOT NULL;

UPDATE "WioaCommunication" comm
SET
  "masterCaseId" = cc."masterCaseId",
  "courseCaseId" = CASE WHEN comm."wioaCaseId" = ccc.course_case_id THEN comm."wioaCaseId" ELSE NULL END,
  "courseId" = CASE WHEN comm."wioaCaseId" = ccc.course_case_id THEN comm."courseId" ELSE NULL END
FROM "WioaCourseCase" cc
JOIN _canonical_course_case ccc ON ccc."learnerId" = cc."learnerId"
WHERE comm."wioaCaseId" = cc.id;

-- A handful of Phase 1 communications predate any case at all (wioaCaseId always null — see the
-- model's original doc comment) and have no learner-matched course-case to resolve a master
-- through; they stay unresolved and are dropped. There is nothing live in this shape today — this
-- only guards a future re-run of this migration pattern against orphaned rows.
DELETE FROM "WioaCommunication" WHERE "masterCaseId" IS NULL;
ALTER TABLE "WioaCommunication" ALTER COLUMN "masterCaseId" SET NOT NULL;

ALTER TABLE "WioaCommunication" DROP CONSTRAINT "WioaCommunication_wioaCaseId_fkey";
ALTER TABLE "WioaCommunication" DROP COLUMN "wioaCaseId";
ALTER TABLE "WioaCommunication" ADD CONSTRAINT "WioaCommunication_masterCaseId_fkey" FOREIGN KEY ("masterCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WioaCommunication" ADD CONSTRAINT "WioaCommunication_courseCaseId_fkey" FOREIGN KEY ("courseCaseId") REFERENCES "WioaCourseCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "WioaCommunication_masterCaseId_idx" ON "WioaCommunication"("masterCaseId");
CREATE INDEX "WioaCommunication_courseCaseId_idx" ON "WioaCommunication"("courseCaseId");

-- 7. Now that every table that moved to the master has had its old wioaCaseId FK fully detached
--    from WioaCourseCase, it's safe to delete course-cases that never reached real funding-stage
--    progress — no EtplFundingRequest and never passed WIOA_ELIGIBLE in the old pipeline. Its
--    eligibility contribution, if it was the canonical one for its learner, is already on the
--    master; nothing more of it is needed.
DELETE FROM "WioaCourseCase" cc
WHERE NOT EXISTS (SELECT 1 FROM "EtplFundingRequest" fr WHERE fr."wioaCaseId" = cc.id)
  AND (SELECT rank FROM _old_status_rank WHERE status = cc.status::text) <= 13;

-- 8. WioaCourseCase itself: drop the board/AJCC/contact/assignment columns (now purely a master
--    concept), convert status to the new funding enum (every surviving row reached funding-range
--    status by construction of step 7), default it forward for future inserts.
--
-- Its own policies no longer have a learnerId/assignedPartnerStaffId to check directly once
-- assignedPartnerStaffId is dropped below — rewritten as one combined policy via
-- app_can_access_master_case, same pattern as the tables above. Not self-referential (queries
-- "WioaCase", a different table), so no split-by-command workaround needed here, unlike WioaCase's
-- own policies.
DROP POLICY wioa_course_case_select ON "WioaCourseCase";
DROP POLICY wioa_course_case_update ON "WioaCourseCase";
DROP POLICY wioa_course_case_delete ON "WioaCourseCase";
DROP POLICY wioa_course_case_insert ON "WioaCourseCase";
CREATE POLICY wioa_course_case_access ON "WioaCourseCase"
  USING (app_can_access_master_case("masterCaseId"))
  WITH CHECK (app_can_access_master_case("masterCaseId"));

ALTER TABLE "WioaCourseCase" DROP CONSTRAINT "WioaCourseCase_workforceBoardId_fkey";
ALTER TABLE "WioaCourseCase" DROP CONSTRAINT "WioaCourseCase_ajccCenterId_fkey";
ALTER TABLE "WioaCourseCase" DROP CONSTRAINT "WioaCourseCase_contactId_fkey";
DROP INDEX "WioaCourseCase_workforceBoardId_idx";
ALTER TABLE "WioaCourseCase" DROP COLUMN "workforceBoardId";
ALTER TABLE "WioaCourseCase" DROP COLUMN "ajccCenterId";
ALTER TABLE "WioaCourseCase" DROP COLUMN "contactId";
ALTER TABLE "WioaCourseCase" DROP COLUMN "assignedPartnerStaffId";

ALTER TABLE "WioaCourseCase" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WioaCourseCase" ALTER COLUMN "status" TYPE "WioaFundingStatus" USING "status"::text::"WioaFundingStatus";
ALTER TABLE "WioaCourseCase" ALTER COLUMN "status" SET DEFAULT 'ETPL_TRAINING_REQUESTED';

-- 9. Old WioaCaseStatus enum is now unused by any column — drop it.
DROP TYPE "WioaCaseStatus";

DROP TABLE _canonical_course_case;
DROP TABLE _old_status_rank;

-- WioaCommunication kept app_can_access_learner throughout — untouched, still correct (learnerId
-- column never moved).

-- New table's RLS.
ALTER TABLE "WioaFundingStatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WioaFundingStatusHistory" FORCE ROW LEVEL SECURITY;
CREATE POLICY wioa_funding_status_history_access ON "WioaFundingStatusHistory"
  USING (app_can_access_case("courseCaseId"))
  WITH CHECK (app_can_access_case("courseCaseId"));
