-- CreateTable
CREATE TABLE "WioaEmailTemplate" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WioaEmailTemplate_pkey" PRIMARY KEY ("id")
);
