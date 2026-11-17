-- Phase 1: No-SSN Rule & PII Boundary (docs/build/PHASE_1_PII_BOUNDARY.md).
--
-- The schema already has no dedicated SSN field anywhere — this closes the other way one could
-- end up stored: pasted into a free-text field (evidence description, staff notes, a rejection
-- reason, an outreach message). CHECK constraints reject the canonical SSN shape (3-2-4 digits,
-- with or without separators) at the database level, so this holds regardless of what the
-- application layer does or forgets to validate.
--
-- Matches ###-##-####, ### ## ####, or ######### (9 bare digits) with word boundaries, so a
-- 10-digit phone number or a longer id string doesn't false-positive.

CREATE OR REPLACE FUNCTION app_contains_ssn_pattern(value text) RETURNS boolean AS $$
  SELECT value ~ '\y[0-9]{3}[- .]?[0-9]{2}[- .]?[0-9]{4}\y';
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE "EvidenceSubmission"
  ADD CONSTRAINT "EvidenceSubmission_no_ssn_description" CHECK (NOT app_contains_ssn_pattern("description"));

ALTER TABLE "WioaCommunication"
  ADD CONSTRAINT "WioaCommunication_no_ssn_subject" CHECK ("subject" IS NULL OR NOT app_contains_ssn_pattern("subject")),
  ADD CONSTRAINT "WioaCommunication_no_ssn_body" CHECK ("body" IS NULL OR NOT app_contains_ssn_pattern("body"));

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_ssn_notes" CHECK ("notes" IS NULL OR NOT app_contains_ssn_pattern("notes"));

ALTER TABLE "WioaDocument"
  ADD CONSTRAINT "WioaDocument_no_ssn_notes" CHECK ("notes" IS NULL OR NOT app_contains_ssn_pattern("notes")),
  ADD CONSTRAINT "WioaDocument_no_ssn_rejectionReason" CHECK ("rejectionReason" IS NULL OR NOT app_contains_ssn_pattern("rejectionReason"));

ALTER TABLE "WioaDocumentVersion"
  ADD CONSTRAINT "WioaDocumentVersion_no_ssn_rejectionReason" CHECK ("rejectionReason" IS NULL OR NOT app_contains_ssn_pattern("rejectionReason"));
