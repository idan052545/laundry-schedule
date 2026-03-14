-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "imageData" TEXT;

-- CreateTable
CREATE TABLE "MessageAssignee" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MessageAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageAssignee_messageId_userId_key" ON "MessageAssignee"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_name_date_key" ON "AttendanceSession"("name", "date");

-- AddForeignKey
ALTER TABLE "MessageAssignee" ADD CONSTRAINT "MessageAssignee_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAssignee" ADD CONSTRAINT "MessageAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
