-- CreateEnum
CREATE TYPE "IncomeCashSource" AS ENUM ('TRUST_DEPOSIT', 'INVOICE_PAYMENT');

-- CreateTable
CREATE TABLE "IncomeCashLedger" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "bankId" INTEGER,
    "projectId" INTEGER,
    "source" "IncomeCashSource" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomeCashLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncomeCashLedger_companyId_createdAt_idx" ON "IncomeCashLedger"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "IncomeCashLedger" ADD CONSTRAINT "IncomeCashLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeCashLedger" ADD CONSTRAINT "IncomeCashLedger_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeCashLedger" ADD CONSTRAINT "IncomeCashLedger_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
