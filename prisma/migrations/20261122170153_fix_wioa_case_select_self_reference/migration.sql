-- Follow-up to 20261122165726_fix_wioa_case_insert_check, same investigation. That migration
-- fixed the direct INSERT failure, but a plain raw INSERT (no RETURNING) succeeding while
-- Prisma's tx.wioaCase.create() (INSERT ... RETURNING under the hood) still failed with the same
-- 42501 revealed the deeper issue: Postgres re-checks a RETURNING row against the USING
-- expressions of applicable SELECT policies, and wioa_case_select's USING (app_can_access_case(id))
-- has the identical self-reference problem as the original WITH CHECK bug — a subquery against
-- WioaCase, evaluated for a row from WioaCase's own INSERT command, in a visibility edge case
-- that a same-transaction-later-statement read (what every *other* table's policy relies on,
-- looking up an already-fully-committed-within-the-transaction WioaCase row by wioaCaseId) does
-- not hit.
--
-- Root issue, stated plainly: app_can_access_case(text) was designed for tables that reference an
-- *existing* WioaCase by foreign key (WioaStatusHistory, Appointment, WioaDocument, etc.) — correct
-- there. Applying it to WioaCase's *own* policies was an unnecessary self-reference from the
-- start; a table's own row-security predicate should read that row's own columns directly, never
-- re-query itself. Fixes select/update/delete alongside insert for consistency, even though only
-- select was confirmed broken — update's WITH CHECK re-checks the post-update row the same way
-- RETURNING does, so it carries the same risk.

DROP POLICY wioa_case_select ON "WioaCase";
DROP POLICY wioa_case_update ON "WioaCase";
DROP POLICY wioa_case_delete ON "WioaCase";

CREATE POLICY wioa_case_select ON "WioaCase"
  FOR SELECT
  USING (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "learnerId" = app_current_user_id()
    OR "assignedPartnerStaffId" = app_current_user_id()
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
