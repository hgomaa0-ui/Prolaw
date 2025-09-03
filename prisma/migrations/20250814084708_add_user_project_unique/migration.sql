/*
  Warnings:

  - A unique constraint covering the columns `[userId,projectId]` on the table `ProjectAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_userId_projectId_key" ON "ProjectAssignment"("userId", "projectId");
