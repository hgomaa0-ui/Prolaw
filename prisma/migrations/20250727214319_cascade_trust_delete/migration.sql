-- DropForeignKey
ALTER TABLE "TrustAccount" DROP CONSTRAINT "TrustAccount_projectId_fkey";

-- DropForeignKey
ALTER TABLE "TrustTransaction" DROP CONSTRAINT "TrustTransaction_trustAccountId_fkey";

-- AddForeignKey
ALTER TABLE "TrustAccount" ADD CONSTRAINT "TrustAccount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustTransaction" ADD CONSTRAINT "TrustTransaction_trustAccountId_fkey" FOREIGN KEY ("trustAccountId") REFERENCES "TrustAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
