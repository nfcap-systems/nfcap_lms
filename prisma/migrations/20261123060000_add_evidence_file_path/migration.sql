-- Phase 3 Feature 1: Real Evidence File Storage.
-- Adds the private-bucket storage object key alongside the existing display-only fileName.
ALTER TABLE "EvidenceSubmission" ADD COLUMN "filePath" TEXT;
