-- CreateEnum
CREATE TYPE "ContentBlockType" AS ENUM ('TEXT', 'BULLET_LIST', 'NUMBERED_LIST', 'HEADER_1', 'HEADER_2', 'HEADER_3', 'IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "Lesson" ALTER COLUMN "body" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "type" "ContentBlockType" NOT NULL,
    "content" TEXT NOT NULL,
    "items" TEXT[],
    "url" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentBlock_lessonId_idx" ON "ContentBlock"("lessonId");

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
