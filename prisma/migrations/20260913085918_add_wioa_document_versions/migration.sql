-- CreateTable
CREATE TABLE "WioaDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "status" "WioaDocumentStatus" NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "WioaDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WioaDocumentVersion_documentId_uploadedAt_idx" ON "WioaDocumentVersion"("documentId", "uploadedAt");

-- AddForeignKey
ALTER TABLE "WioaDocumentVersion" ADD CONSTRAINT "WioaDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "WioaDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
