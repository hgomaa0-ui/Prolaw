-- CreateTable
CREATE TABLE "ManagerLawyer" (
    "managerId" INTEGER NOT NULL,
    "lawyerId" INTEGER NOT NULL,

    CONSTRAINT "ManagerLawyer_pkey" PRIMARY KEY ("managerId","lawyerId")
);

-- AddForeignKey
ALTER TABLE "ManagerLawyer" ADD CONSTRAINT "ManagerLawyer_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerLawyer" ADD CONSTRAINT "ManagerLawyer_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
