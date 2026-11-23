-- Phase 3 Feature 7: Per-Criterion Review & Gated Certification.
-- Admin's overall note to the learner on an evidence submission (ADM11-PerCriterionReview).
ALTER TABLE "EvidenceSubmission" ADD COLUMN "reviewerNote" TEXT;

-- CreateTable
CREATE TABLE "CriterionAssessment" (
    "id" TEXT NOT NULL,
    "evidenceSubmissionId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "met" BOOLEAN,
    "reviewerNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CriterionAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CriterionAssessment_evidenceSubmissionId_criterionId_key" ON "CriterionAssessment"("evidenceSubmissionId", "criterionId");

-- CreateIndex
CREATE INDEX "CriterionAssessment_criterionId_idx" ON "CriterionAssessment"("criterionId");

-- AddForeignKey
ALTER TABLE "CriterionAssessment" ADD CONSTRAINT "CriterionAssessment_evidenceSubmissionId_fkey" FOREIGN KEY ("evidenceSubmissionId") REFERENCES "EvidenceSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionAssessment" ADD CONSTRAINT "CriterionAssessment_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "AssessmentCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
