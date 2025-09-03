/*
  Warnings:

  - A unique constraint covering the columns `[clientId,projectId,currency]` on the table `TrustAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TrustAccount" ADD COLUMN     "projectId" INTEGER;

-- AlterTable
ALTER TABLE "TrustTransaction" ADD COLUMN     "projectId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "TrustAccount_clientId_projectId_currency_key" ON "TrustAccount"("clientId", "projectId", "currency");

-- AddForeignKey
ALTER TABLE "TrustAccount" ADD CONSTRAINT "TrustAccount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustTransaction" ADD CONSTRAINT "TrustTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
