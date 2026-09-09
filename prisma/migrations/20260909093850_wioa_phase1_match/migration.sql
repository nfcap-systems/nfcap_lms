-- CreateEnum
CREATE TYPE "FundingSource" AS ENUM ('SELF_PAY', 'WIOA_PENDING');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('PRIMARY', 'SECONDARY', 'GENERAL');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'CALL');

-- CreateTable
CREATE TABLE "LearnerProfile" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "preferredLanguage" TEXT,
    "employmentStatus" TEXT,
    "unemploymentInsuranceStatus" TEXT,
    "trainingApprenticeshipInterest" TEXT,
    "fundingSource" "FundingSource" NOT NULL DEFAULT 'SELF_PAY',
    "dateOfBirth" TIMESTAMP(3),
    "mobilePhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceBoard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "serviceArea" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "orientationUrl" TEXT,
    "applicationUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkforceBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AjccCenter" (
    "id" TEXT NOT NULL,
    "workforceBoardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "intakeInstructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AjccCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceJurisdiction" (
    "id" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "workforceBoardId" TEXT NOT NULL,
    "ajccCenterId" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkforceJurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceContact" (
    "id" TEXT NOT NULL,
    "workforceBoardId" TEXT NOT NULL,
    "ajccCenterId" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "contactType" "ContactType" NOT NULL DEFAULT 'PRIMARY',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastVerifiedDate" TIMESTAMP(3),

    CONSTRAINT "WorkforceContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WioaCommunication" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "contactId" TEXT,
    "channel" "CommunicationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WioaCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProfile_learnerId_key" ON "LearnerProfile"("learnerId");

-- CreateIndex
CREATE INDEX "AjccCenter_workforceBoardId_idx" ON "AjccCenter"("workforceBoardId");

-- CreateIndex
CREATE INDEX "WorkforceJurisdiction_zip_idx" ON "WorkforceJurisdiction"("zip");

-- CreateIndex
CREATE INDEX "WorkforceJurisdiction_workforceBoardId_idx" ON "WorkforceJurisdiction"("workforceBoardId");

-- CreateIndex
CREATE INDEX "WorkforceContact_workforceBoardId_idx" ON "WorkforceContact"("workforceBoardId");

-- CreateIndex
CREATE INDEX "WioaCommunication_learnerId_idx" ON "WioaCommunication"("learnerId");

-- CreateIndex
CREATE INDEX "WioaCommunication_courseId_idx" ON "WioaCommunication"("courseId");

-- AddForeignKey
ALTER TABLE "AjccCenter" ADD CONSTRAINT "AjccCenter_workforceBoardId_fkey" FOREIGN KEY ("workforceBoardId") REFERENCES "WorkforceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceJurisdiction" ADD CONSTRAINT "WorkforceJurisdiction_workforceBoardId_fkey" FOREIGN KEY ("workforceBoardId") REFERENCES "WorkforceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceJurisdiction" ADD CONSTRAINT "WorkforceJurisdiction_ajccCenterId_fkey" FOREIGN KEY ("ajccCenterId") REFERENCES "AjccCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceContact" ADD CONSTRAINT "WorkforceContact_workforceBoardId_fkey" FOREIGN KEY ("workforceBoardId") REFERENCES "WorkforceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforceContact" ADD CONSTRAINT "WorkforceContact_ajccCenterId_fkey" FOREIGN KEY ("ajccCenterId") REFERENCES "AjccCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaCommunication" ADD CONSTRAINT "WioaCommunication_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaCommunication" ADD CONSTRAINT "WioaCommunication_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WorkforceContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
