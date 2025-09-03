-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('HOURS', 'FIXED');

-- CreateEnum
CREATE TYPE "RateSource" AS ENUM ('LAWYER', 'PROJECT');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "billingType" "BillingType" NOT NULL DEFAULT 'HOURS',
ADD COLUMN     "fixedFee" DECIMAL(65,30),
ADD COLUMN     "rateSource" "RateSource";
