-- Fixes infinite recursion in the RLS predicate helpers added by
-- prisma/migrations/20261105120000_add_rls_wioa_pii.
--
-- app_can_access_case()/app_can_access_learner() each run a SELECT against the very table their
-- policy secures (WioaCase). That internal SELECT is itself subject to the same RLS policy
-- (Postgres rewrites every query against a FORCE ROW LEVEL SECURITY table to AND in its USING
-- clause, regardless of the caller's role), which calls the helper again for its own candidate
-- rows, which runs the same SELECT again, forever — surfaced as Postgres error 54001 ("stack
-- depth limit exceeded") the first time any withRlsContext call actually read WioaCase
-- (docs/build/PHASE_1_PROGRESS.md's wioa.ts rewiring; never triggered before that, since nothing
-- previously exercised these RLS policies against real data).
--
-- SECURITY DEFINER makes the function body run as its owner — whichever role applied this
-- migration, always the DB's bootstrap/superuser role in both Supabase and a fresh test
-- Postgres, which already has BYPASSRLS — instead of the caller (app_runtime). The function's
-- internal SELECT then bypasses RLS entirely, breaking the recursion; the outer query calling
-- the helper still goes through RLS as app_runtime exactly as before.
ALTER FUNCTION app_can_access_learner(text) SECURITY DEFINER;
ALTER FUNCTION app_can_access_learner(text) SET search_path = public;

ALTER FUNCTION app_can_access_case(text) SECURITY DEFINER;
ALTER FUNCTION app_can_access_case(text) SET search_path = public;
