-- CreateTable
CREATE TABLE "AktualiaEntry" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AktualiaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AktualiaEntry_roomNumber_date_key" ON "AktualiaEntry"("roomNumber", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AktualiaEntry_userId_date_key" ON "AktualiaEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "AktualiaEntry" ADD CONSTRAINT "AktualiaEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
