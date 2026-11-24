-- Quiz Bank cross-course sharing (docs/build/LAYER1_DATA_MODEL_DESIGN.md, 2026-11-24 decision).
-- QuizQuestion stops being owned by exactly one Assessment and becomes a shared, reusable bank
-- item; AssessmentQuestion is the new join recording which questions are attached to which
-- course's Assessment, and in what order for that course specifically.
--
-- Order matters here: the join table is created and backfilled from QuizQuestion's existing
-- assessmentId/order columns BEFORE those columns are dropped, so every question already in use
-- keeps its current course attachment — nothing silently detaches on migration day.

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- Data migration: preserve every existing question's current course attachment as its first
-- AssessmentQuestion row before the direct-ownership columns below disappear.
INSERT INTO "AssessmentQuestion" ("id", "assessmentId", "questionId", "order")
SELECT gen_random_uuid()::text, "assessmentId", "id", "order"
FROM "QuizQuestion";

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_questionId_idx" ON "AssessmentQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_questionId_key" ON "AssessmentQuestion"("assessmentId", "questionId");

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Now safe to remove QuizQuestion's old direct-ownership columns — every row's link is preserved
-- above.
-- DropForeignKey
ALTER TABLE "QuizQuestion" DROP CONSTRAINT "QuizQuestion_assessmentId_fkey";

-- DropIndex
DROP INDEX "QuizQuestion_assessmentId_idx";

-- AlterTable
ALTER TABLE "QuizQuestion" DROP COLUMN "assessmentId",
DROP COLUMN "order",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
