-- CreateTable
CREATE TABLE "MaterialRead" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRead_materialId_userId_key" ON "MaterialRead"("materialId", "userId");

-- AddForeignKey
ALTER TABLE "MaterialRead" ADD CONSTRAINT "MaterialRead_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ProfessionalMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRead" ADD CONSTRAINT "MaterialRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
