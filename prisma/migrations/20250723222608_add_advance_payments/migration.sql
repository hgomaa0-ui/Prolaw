-- CreateTable
CREATE TABLE "AdvancePayment" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "AdvancePayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
