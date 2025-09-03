-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CurrencyCode" ADD VALUE 'GBP';
ALTER TYPE "CurrencyCode" ADD VALUE 'SAR';
ALTER TYPE "CurrencyCode" ADD VALUE 'AED';
ALTER TYPE "CurrencyCode" ADD VALUE 'QAR';
ALTER TYPE "CurrencyCode" ADD VALUE 'KWD';
ALTER TYPE "CurrencyCode" ADD VALUE 'OMR';
ALTER TYPE "CurrencyCode" ADD VALUE 'JPY';
ALTER TYPE "CurrencyCode" ADD VALUE 'CNY';
ALTER TYPE "CurrencyCode" ADD VALUE 'INR';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "projectId" INTEGER;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
