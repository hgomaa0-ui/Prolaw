-- Add companyId column and relation to BankTransaction
ALTER TABLE "BankTransaction"
  ADD COLUMN "companyId" INTEGER;

-- Foreign key to Company
ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL;

-- Optional index for performance
CREATE INDEX "BankTransaction_companyId_idx" ON "BankTransaction" ("companyId");
