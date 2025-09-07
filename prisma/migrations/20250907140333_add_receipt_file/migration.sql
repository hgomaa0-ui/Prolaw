/*
  Warnings:

  - A unique constraint covering the columns `[companyId,code]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Project_code_key";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "receiptFile" BYTEA,
ADD COLUMN     "receiptMime" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_companyId_code_key" ON "Project"("companyId", "code");
