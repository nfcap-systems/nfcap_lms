-- Phase 1: Pathway Structure Seam, Platform-Wide Audit Trail, Secrets/Rate Limiting backing table.

-- Pathway Structure Seam
CREATE TABLE "Pathway" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pathway_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Pathway" ("id", "name", "description", "isDefault", "createdAt", "updatedAt")
VALUES (
    'default-pathway',
    'Flooring Apprenticeship',
    'The NFCAP flooring apprenticeship pathway. Seeded as the single default pathway — see docs/build/PHASE_1_DB_ACCESS_DECISION.md''s sibling features for the open multi-pathway decision.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

ALTER TABLE "Course" ADD COLUMN "pathwayId" TEXT;
UPDATE "Course" SET "pathwayId" = 'default-pathway';
ALTER TABLE "Course" ALTER COLUMN "pathwayId" SET NOT NULL;
ALTER TABLE "Course" ADD CONSTRAINT "Course_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Platform-Wide Audit Trail
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- Secrets, Environment & Rate Limiting
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_identifier_action_windowStart_key" ON "RateLimitBucket"("identifier", "action", "windowStart");
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

-- AuditLog is readable only by ADMIN; written by any authenticated server action (the action
-- code decides what's worth logging, not the DB) — mirrors the RLS pattern from
-- docs/build/PHASE_1_DB_ACCESS_DECISION.md. Append-only: no UPDATE/DELETE policy means neither is
-- ever allowed, for app_runtime or anyone else without BYPASSRLS.
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_log_read ON "AuditLog"
  FOR SELECT
  USING (app_current_role() = 'ADMIN');

CREATE POLICY audit_log_write ON "AuditLog"
  FOR INSERT
  WITH CHECK (true);

-- RateLimitBucket carries no PII and needs to be written by unauthenticated requests (a login
-- attempt before any session exists) — no RLS; `app_runtime` already has CRUD on it via the
-- ALL TABLES grant in the prior migration.
