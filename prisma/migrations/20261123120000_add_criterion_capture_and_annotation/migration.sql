-- Phase 3 Features 8 (Photo Annotation) and 9 (Guided Evidence Capture).
-- Extends the existing per-criterion row (CriterionAssessment) to also carry the learner's own
-- per-criterion capture (LRN06b/c) and the reviewer's photo annotation overlay (ADM12), instead of
-- adding a new model -- the row is already scoped at the right granularity (one per
-- submission+criterion).
ALTER TABLE "CriterionAssessment" ADD COLUMN "learnerFilePath" TEXT;
ALTER TABLE "CriterionAssessment" ADD COLUMN "learnerFileName" TEXT;
ALTER TABLE "CriterionAssessment" ADD COLUMN "learnerDescription" TEXT;
ALTER TABLE "CriterionAssessment" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "CriterionAssessment" ADD COLUMN "annotationData" JSONB;
