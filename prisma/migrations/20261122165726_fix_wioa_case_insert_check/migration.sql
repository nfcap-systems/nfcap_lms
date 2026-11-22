-- Fixes a real bug found while verifying the design-system migration's Coordinator case-list
-- retrofit, 2026-11-22: a learner sending WIOA outreach (src/lib/actions/wioa.ts's
-- sendWioaOutreach, the only INSERT into WioaCase) always failed with Postgres error 42501 ("new
-- row violates row-level security policy for table WioaCase"), silently — the client UI showed no
-- error, so this had never been noticed. No WioaCase row has ever been successfully created
-- through the app since prisma/migrations/20261105120000_add_rls_wioa_pii enabled RLS on this
-- table.
--
-- Root cause: wioa_case_access's single USING/WITH CHECK expression, app_can_access_case(id),
-- re-queries WioaCase by id to decide access — correct for SELECT/UPDATE/DELETE, where the row
-- already exists, but wrong for INSERT's WITH CHECK, where the row being inserted is not yet
-- visible to a query against its own table (ordinary MVCC command-id visibility, not an RLS
-- effect — SECURITY DEFINER on the helper, added by
-- prisma/migrations/20261117050000_fix_rls_helper_recursion, bypasses RLS inside the function but
-- can't make an uncommitted row appear). The EXISTS subquery inside app_can_access_case therefore
-- always returns false on INSERT, so every WITH CHECK evaluation fails.
--
-- Fix: scope the existing policy to the commands where re-querying the row is valid (SELECT,
-- UPDATE, DELETE), and add a dedicated INSERT policy whose WITH CHECK reads the new row's own
-- learnerId/assignedPartnerStaffId columns directly instead of looking itself up — matching the
-- same role rules (ADMIN/WIOA_COORDINATOR see everything; a learner may only open a case for
-- themselves; PARTNER_STAFF has no legitimate reason to create a case directly, same as before).
-- Every other table added by that migration references wioaCaseId on an *existing* WioaCase row
-- (the case is always inserted first, in the same transaction, so later statements in that same
-- transaction do see it) — this bug is isolated to WioaCase's own self-referential policy.

DROP POLICY wioa_case_access ON "WioaCase";

CREATE POLICY wioa_case_select ON "WioaCase"
  FOR SELECT
  USING (app_can_access_case(id));

CREATE POLICY wioa_case_update ON "WioaCase"
  FOR UPDATE
  USING (app_can_access_case(id))
  WITH CHECK (app_can_access_case(id));

CREATE POLICY wioa_case_delete ON "WioaCase"
  FOR DELETE
  USING (app_can_access_case(id));

CREATE POLICY wioa_case_insert ON "WioaCase"
  FOR INSERT
  WITH CHECK (
    app_current_role() IN ('ADMIN', 'WIOA_COORDINATOR')
    OR "learnerId" = app_current_user_id()
  );
