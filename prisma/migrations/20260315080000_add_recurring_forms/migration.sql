-- AlterTable
ALTER TABLE "FormLink" ADD COLUMN "recurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FormLink" ADD COLUMN "reminderTime" TEXT;

-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN "date" TEXT;

-- DropIndex
DROP INDEX "FormSubmission_formId_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_formId_userId_date_key" ON "FormSubmission"("formId", "userId", "date");
