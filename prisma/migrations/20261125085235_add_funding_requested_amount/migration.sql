-- Funding Impact Reporting (Phase 5, feature #5) — adds the "requested" side of a
-- requested-vs-approved funding comparison; FundingAuthorization.approvedAmount only ever
-- captured what was granted. Generated via `prisma migrate diff --from-config-datasource
-- --to-schema --script` against the live project, not `migrate dev` — no local/shadow database
-- is available in this environment (same constraint as the Layer 1 migration).
--
-- Scoped to only this column: the diff also reported an unrelated, pre-existing drift
-- (QuizQuestion.updatedAt's DB default vs. schema's `@updatedAt`) that predates this change and
-- isn't part of this feature — deliberately left out of this migration rather than bundled in.
--
-- Applied via `prisma migrate deploy` in the same session this file was written, immediately
-- after — not left generated-but-unapplied (CLAUDE.local.md mistake #8).

-- AlterTable
ALTER TABLE "EtplFundingRequest" ADD COLUMN     "requestedAmount" DOUBLE PRECISION;
