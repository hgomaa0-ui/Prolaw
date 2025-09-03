-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "approvedAt" TIMESTAMP(3);
