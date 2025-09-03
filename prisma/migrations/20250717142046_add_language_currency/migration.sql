-- CreateEnum
CREATE TYPE "InvoiceLanguage" AS ENUM ('EN', 'AR');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('USD', 'EUR', 'EGP');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'USD',
ADD COLUMN     "language" "InvoiceLanguage" NOT NULL DEFAULT 'EN';
