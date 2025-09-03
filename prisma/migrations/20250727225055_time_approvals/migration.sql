-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "accountantApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accountantId" INTEGER,
ADD COLUMN     "managerApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managerId" INTEGER;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_accountantId_fkey" FOREIGN KEY ("accountantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
