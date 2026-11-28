-- CAP-4: lets staff raise the upload cap for one document via "Allow another upload"
-- (src/lib/actions/wioa.ts, allowAnotherWioaDocumentUpload). Null means the standard
-- MAX_UPLOADS_PER_DOCUMENT cap (src/lib/wioa/constants.ts) applies unchanged.
--
-- Scoped to only this change -- `prisma migrate diff` against the live schema also reported
-- unrelated pre-existing drift (QuizQuestion.updatedAt's default), left out per CLAUDE.local.md #8.
ALTER TABLE "WioaDocument" ADD COLUMN "uploadLimitOverride" INTEGER;
