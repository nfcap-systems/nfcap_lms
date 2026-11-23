-- Phase 3 Feature 10 (Per-Criterion Feedback & Targeted Resubmission) / 11 (Attempt History).
-- A targeted resubmission copies already-Met criteria into the new EvidenceSubmission so the
-- learner only redoes what wasn't met. This flag marks those copies so attempt history can tell a
-- real attempt from a carried-forward verdict.
ALTER TABLE "CriterionAssessment" ADD COLUMN "carriedForward" BOOLEAN NOT NULL DEFAULT false;
