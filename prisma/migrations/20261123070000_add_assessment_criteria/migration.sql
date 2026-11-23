-- CreateTable
CREATE TABLE "AssessmentCriterion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "guidance" TEXT NOT NULL,
    "photoRequired" BOOLEAN NOT NULL DEFAULT true,
    "mandatoryForCertification" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,

    CONSTRAINT "AssessmentCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentCriterion_courseId_order_idx" ON "AssessmentCriterion"("courseId", "order");

-- AddForeignKey
ALTER TABLE "AssessmentCriterion" ADD CONSTRAINT "AssessmentCriterion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

