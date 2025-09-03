-- AlterEnum
ALTER TYPE "IncomeCashSource" ADD VALUE 'OFFICE_EXPENSE';

-- CreateTable
CREATE TABLE "OfficeExpense" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "bankId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "projectId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeExpense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OfficeExpense" ADD CONSTRAINT "OfficeExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeExpense" ADD CONSTRAINT "OfficeExpense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeExpense" ADD CONSTRAINT "OfficeExpense_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
