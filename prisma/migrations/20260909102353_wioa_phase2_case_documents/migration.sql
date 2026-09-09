-- CreateEnum
CREATE TYPE "WioaCaseStatus" AS ENUM ('REGISTERED', 'WORKFORCE_BOARD_MATCHED', 'INITIAL_CONTACT_SENT', 'AWAITING_RESPONSE', 'ORIENTATION_SCHEDULED', 'ORIENTATION_COMPLETED', 'CALJOBS_COMPLETED', 'WIOA_APPLICATION_SUBMITTED', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED', 'INTAKE_APPOINTMENT_SCHEDULED', 'ELIGIBILITY_UNDER_REVIEW', 'WIOA_ELIGIBLE', 'ETPL_TRAINING_REQUESTED', 'TRAINING_AUTHORIZATION_PENDING', 'TUITION_APPROVED', 'APPRENTICESHIP_ENROLLMENT_COMPLETE', 'CLOSED_INELIGIBLE');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('ORIENTATION', 'INTAKE', 'FOLLOWUP');

-- CreateEnum
CREATE TYPE "WioaDocumentStatus" AS ENUM ('MISSING', 'UPLOADED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'NOT_APPLICABLE');

-- AlterTable
ALTER TABLE "WioaCommunication" ADD COLUMN     "wioaCaseId" TEXT;

-- CreateTable
CREATE TABLE "WioaCase" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "workforceBoardId" TEXT,
    "ajccCenterId" TEXT,
    "contactId" TEXT,
    "assignedPartnerStaffId" TEXT,
    "status" "WioaCaseStatus" NOT NULL DEFAULT 'INITIAL_CONTACT_SENT',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WioaCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WioaStatusHistory" (
    "id" TEXT NOT NULL,
    "wioaCaseId" TEXT NOT NULL,
    "status" "WioaCaseStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,

    CONSTRAINT "WioaStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "wioaCaseId" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WioaDocumentRequirement" (
    "id" TEXT NOT NULL,
    "workforceBoardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "conditional" BOOLEAN NOT NULL DEFAULT false,
    "applicableRule" TEXT,

    CONSTRAINT "WioaDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WioaDocument" (
    "id" TEXT NOT NULL,
    "wioaCaseId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "fileName" TEXT,
    "storagePath" TEXT,
    "status" "WioaDocumentStatus" NOT NULL DEFAULT 'MISSING',
    "uploadedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expirationDate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "WioaDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WioaCase_learnerId_idx" ON "WioaCase"("learnerId");

-- CreateIndex
CREATE INDEX "WioaCase_courseId_idx" ON "WioaCase"("courseId");

-- CreateIndex
CREATE INDEX "WioaCase_workforceBoardId_idx" ON "WioaCase"("workforceBoardId");

-- CreateIndex
CREATE INDEX "WioaStatusHistory_wioaCaseId_changedAt_idx" ON "WioaStatusHistory"("wioaCaseId", "changedAt");

-- CreateIndex
CREATE INDEX "Appointment_wioaCaseId_idx" ON "Appointment"("wioaCaseId");

-- CreateIndex
CREATE INDEX "WioaDocumentRequirement_workforceBoardId_idx" ON "WioaDocumentRequirement"("workforceBoardId");

-- CreateIndex
CREATE INDEX "WioaDocument_wioaCaseId_idx" ON "WioaDocument"("wioaCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "WioaDocument_wioaCaseId_requirementId_key" ON "WioaDocument"("wioaCaseId", "requirementId");

-- CreateIndex
CREATE INDEX "WioaCommunication_wioaCaseId_idx" ON "WioaCommunication"("wioaCaseId");

-- AddForeignKey
ALTER TABLE "WioaCommunication" ADD CONSTRAINT "WioaCommunication_wioaCaseId_fkey" FOREIGN KEY ("wioaCaseId") REFERENCES "WioaCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaCase" ADD CONSTRAINT "WioaCase_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaCase" ADD CONSTRAINT "WioaCase_workforceBoardId_fkey" FOREIGN KEY ("workforceBoardId") REFERENCES "WorkforceBoard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaCase" ADD CONSTRAINT "WioaCase_ajccCenterId_fkey" FOREIGN KEY ("ajccCenterId") REFERENCES "AjccCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaCase" ADD CONSTRAINT "WioaCase_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WorkforceContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaStatusHistory" ADD CONSTRAINT "WioaStatusHistory_wioaCaseId_fkey" FOREIGN KEY ("wioaCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_wioaCaseId_fkey" FOREIGN KEY ("wioaCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaDocumentRequirement" ADD CONSTRAINT "WioaDocumentRequirement_workforceBoardId_fkey" FOREIGN KEY ("workforceBoardId") REFERENCES "WorkforceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaDocument" ADD CONSTRAINT "WioaDocument_wioaCaseId_fkey" FOREIGN KEY ("wioaCaseId") REFERENCES "WioaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WioaDocument" ADD CONSTRAINT "WioaDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "WioaDocumentRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
