-- Migration: create ExpenseCashLedger table
CREATE TABLE "ExpenseCashLedger" (
  "id"         SERIAL PRIMARY KEY,
  "companyId"  INTEGER  NOT NULL,
  "clientId"   INTEGER,
  "projectId"  INTEGER,
  "amount"     NUMERIC(65,30) NOT NULL,
  "currency"   TEXT     NOT NULL DEFAULT 'USD',
  "notes"      TEXT,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExpenseCashLedger_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
  CONSTRAINT "ExpenseCashLedger_clientId_fkey"
    FOREIGN KEY ("clientId")  REFERENCES "Client"("id"),
  CONSTRAINT "ExpenseCashLedger_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
);

-- Index
CREATE INDEX "ExpenseCashLedger_companyId_createdAt_idx"
  ON "ExpenseCashLedger" ("companyId", "createdAt");
