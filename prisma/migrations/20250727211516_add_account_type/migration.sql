/*
  Warnings:

  - A unique constraint covering the columns `[clientId,projectId,currency,accountType]` on the table `TrustAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TrustAccount_clientId_projectId_currency_key";

-- AlterTable
ALTER TABLE "TrustAccount" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'TRUST';

-- CreateIndex
CREATE UNIQUE INDEX "TrustAccount_clientId_projectId_currency_accountType_key" ON "TrustAccount"("clientId", "projectId", "currency", "accountType");
