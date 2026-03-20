-- AlterTable
ALTER TABLE "User" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'he';

-- CreateTable
CREATE TABLE "TranslationCache" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "translated" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranslationCache_sourceHash_key" ON "TranslationCache"("sourceHash");

-- CreateIndex
CREATE INDEX "TranslationCache_sourceHash_idx" ON "TranslationCache"("sourceHash");
