-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('TRUST', 'EXPENSE');

-- AlterTable
ALTER TABLE "AdvancePayment" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'TRUST';
