-- AlterTable
ALTER TABLE "UserPermission" ADD COLUMN     "clientIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "itemIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "lawyerIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "projectIds" JSONB NOT NULL DEFAULT '[]';
