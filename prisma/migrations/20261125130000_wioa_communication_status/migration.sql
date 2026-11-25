-- WIOA spec-alignment gap #7 (docs/plans/wioa-spec-alignment-kickoff.md #7) — spec Section 19:
-- "Every outgoing email must be logged with recipient, timestamp, and status." WioaCommunication
-- never had a status field at all; this session's own earlier deliverability fix made failures
-- disappear entirely (a row was only ever written after a successful send). Purely additive —
-- every existing row is a real past send, so SENT is the correct backfill default.
CREATE TYPE "CommunicationStatus" AS ENUM ('SENT', 'FAILED');

ALTER TABLE "WioaCommunication" ADD COLUMN "status" "CommunicationStatus" NOT NULL DEFAULT 'SENT';
ALTER TABLE "WioaCommunication" ADD COLUMN "failureReason" TEXT;
