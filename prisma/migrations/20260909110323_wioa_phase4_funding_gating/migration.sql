-- CreateEnum
CREATE TYPE "CourseUnlockSource" AS ENUM ('WIOA_FUNDING', 'ADMIN_ASSIGNMENT');

-- CreateTable
CREATE TABLE "EtplFundingRequest" (
    "id" TEXT NOT NULL,
    "wioaCaseId" TEXT NOT NULL,
    "trainingProgram" TEXT,
    "etplProviderConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "caseManagerNotifiedAt" TIMESTAMP(3),
    "fundingReviewStatus" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtplFundingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingAuthorization" (
    "id" TEXT NOT NULL,
    "fundingRequestId" TEXT NOT NULL,
    "itaIssuedAt" TIMESTAMP(3),
    "approvedAmount" DOUBLE PRECISION,
    "approvalDate" TIMESTAMP(3),
    "trainingStartDate" TIMESTAMP(3),
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseUnlock" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "source" "CourseUnlockSource" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT NOT NULL,

    CONSTRAINT "CourseUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EtplFundingRequest_wioaCaseId_key" ON "EtplFundingRequest"("wioaCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "FundingAuthorization_fundingRequestId_key" ON "FundingAuthorization"("fundingRequestId");

-- CreateIndex
CREATE INDEX "CourseUnlock_learnerId_idx" ON "CourseUnlock"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseUnlock_learnerId_courseId_key" ON "CourseUnlock"("learnerId", "courseId");

-- AddForeignKey
ALTER TABLE "EtplFundingRequest" ADD CONSTRAINT "EtplFundingRequest_wioaCaseId_fkey" FOREIGN KEY ("wioaCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingAuthorization" ADD CONSTRAINT "FundingAuthorization_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "EtplFundingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseUnlock" ADD CONSTRAINT "CourseUnlock_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
