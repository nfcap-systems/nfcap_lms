-- Phase 1 — Row-Level Access Rules (docs/build/PHASE_1_DB_ACCESS_DECISION.md, Option A).
--
-- The runtime connection (`postgres`, used via DATABASE_URL) has BYPASSRLS and owns every table,
-- so it skips RLS unconditionally. This migration adds a second, non-owner role for the app to
-- connect as, scoped to the WIOA/PII tables the decision doc calls out first: LearnerProfile,
-- WioaCase and its direct children, EtplFundingRequest/FundingAuthorization, EvidenceSubmission.
--
-- NOT APPLIED YET. `app_runtime` is created with LOGIN but no password here — set one manually
-- (ALTER ROLE app_runtime WITH PASSWORD '<generated>') outside git, then point a new
-- APP_RUNTIME_DATABASE_URL env var at it. See docs/build/PHASE_1_DB_ACCESS_DECISION.md "Applying
-- this migration" before running `prisma migrate deploy` against the real project.

-- 1. The non-owner runtime role. Deliberately NOT a superuser, NOT BYPASSRLS, does not own any
--    table (tables stay owned by `postgres`) — all three are required for RLS to actually apply.
CREATE ROLE app_runtime LOGIN;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

-- 2. Session context the policies below read. Set once per transaction via `SET LOCAL` (see
--    src/lib/db/rls.ts) — transaction-scoped, safe under Supavisor's transaction-mode pooler.
--    `current_setting(..., true)` (the `true` = missing_ok) returns NULL rather than erroring
--    for any connection that never sets it (migrations, the `postgres` role, etc).

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text AS $$
  SELECT current_setting('app.user_id', true);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text AS $$
  SELECT current_setting('app.user_role', true);
$$ LANGUAGE sql STABLE;

-- 3. Predicate helpers — one place for "can this session see this learner / this case," reused
--    across every policy below instead of repeating the role/ownership logic per table.
--
--    Mirrors the role rules already enforced in src/lib/actions/guard.ts:
--    ADMIN and WIOA_COORDINATOR see everything; a learner sees only their own; PARTNER_STAFF sees
--    only cases assigned to them (WioaCase.assignedPartnerStaffId).

CREATE OR REPLACE FUNCTION app_can_access_learner(target_learner_id text) RETURNS boolean AS $$
  SELECT
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR app_current_user_id() = target_learner_id
    OR (
      app_current_role() = 'PARTNER_STAFF'
      AND EXISTS (
        SELECT 1 FROM "WioaCase" wc
        WHERE wc."learnerId" = target_learner_id
          AND wc."assignedPartnerStaffId" = app_current_user_id()
      )
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_can_access_case(target_case_id text) RETURNS boolean AS $$
  SELECT
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR EXISTS (
      SELECT 1 FROM "WioaCase" wc
      WHERE wc.id = target_case_id
        AND (wc."learnerId" = app_current_user_id() OR wc."assignedPartnerStaffId" = app_current_user_id())
    );
$$ LANGUAGE sql STABLE;

-- 4. Enable + force RLS on the scoped tables. FORCE is required even though app_runtime isn't the
--    owner, for defense in depth if ownership ever changes; it's a no-op otherwise.

ALTER TABLE "LearnerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearnerProfile" FORCE ROW LEVEL SECURITY;
CREATE POLICY learner_profile_access ON "LearnerProfile"
  USING (app_can_access_learner("learnerId"))
  WITH CHECK (app_can_access_learner("learnerId"));

ALTER TABLE "WioaCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WioaCase" FORCE ROW LEVEL SECURITY;
CREATE POLICY wioa_case_access ON "WioaCase"
  USING (app_can_access_case(id))
  WITH CHECK (app_can_access_case(id));

ALTER TABLE "WioaStatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WioaStatusHistory" FORCE ROW LEVEL SECURITY;
CREATE POLICY wioa_status_history_access ON "WioaStatusHistory"
  USING (app_can_access_case("wioaCaseId"))
  WITH CHECK (app_can_access_case("wioaCaseId"));

ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" FORCE ROW LEVEL SECURITY;
CREATE POLICY appointment_access ON "Appointment"
  USING (app_can_access_case("wioaCaseId"))
  WITH CHECK (app_can_access_case("wioaCaseId"));

ALTER TABLE "WioaCommunication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WioaCommunication" FORCE ROW LEVEL SECURITY;
CREATE POLICY wioa_communication_access ON "WioaCommunication"
  USING (app_can_access_learner("learnerId"))
  WITH CHECK (app_can_access_learner("learnerId"));

ALTER TABLE "WioaDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WioaDocument" FORCE ROW LEVEL SECURITY;
CREATE POLICY wioa_document_access ON "WioaDocument"
  USING (app_can_access_case("wioaCaseId"))
  WITH CHECK (app_can_access_case("wioaCaseId"));

ALTER TABLE "WioaDocumentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WioaDocumentVersion" FORCE ROW LEVEL SECURITY;
CREATE POLICY wioa_document_version_access ON "WioaDocumentVersion"
  USING (
    EXISTS (
      SELECT 1 FROM "WioaDocument" d
      WHERE d.id = "documentId" AND app_can_access_case(d."wioaCaseId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "WioaDocument" d
      WHERE d.id = "documentId" AND app_can_access_case(d."wioaCaseId")
    )
  );

ALTER TABLE "EtplFundingRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EtplFundingRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY etpl_funding_request_access ON "EtplFundingRequest"
  USING (app_can_access_case("wioaCaseId"))
  WITH CHECK (app_can_access_case("wioaCaseId"));

ALTER TABLE "FundingAuthorization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FundingAuthorization" FORCE ROW LEVEL SECURITY;
CREATE POLICY funding_authorization_access ON "FundingAuthorization"
  USING (
    EXISTS (
      SELECT 1 FROM "EtplFundingRequest" r
      WHERE r.id = "fundingRequestId" AND app_can_access_case(r."wioaCaseId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "EtplFundingRequest" r
      WHERE r.id = "fundingRequestId" AND app_can_access_case(r."wioaCaseId")
    )
  );

-- EvidenceSubmission is not WIOA-specific, but carries learner-submitted evidence text/files —
-- scoped to ADMIN (review) and the owning learner (via Enrollment), not PARTNER_STAFF/COORDINATOR,
-- matching requireAdmin-gated review in src/lib/actions/progress.ts (setEvidenceStatus).
ALTER TABLE "EvidenceSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenceSubmission" FORCE ROW LEVEL SECURITY;
CREATE POLICY evidence_submission_access ON "EvidenceSubmission"
  USING (
    app_current_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM "Enrollment" e
      WHERE e.id = "enrollmentId" AND e."learnerId" = app_current_user_id()
    )
  )
  WITH CHECK (
    app_current_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM "Enrollment" e
      WHERE e.id = "enrollmentId" AND e."learnerId" = app_current_user_id()
    )
  );
