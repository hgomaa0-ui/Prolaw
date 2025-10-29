-- Migration: add Task table (minimal)

DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('PENDING','IN_PROGRESS','DONE','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Task" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "clientId" INT,
  "projectId" INT,
  "assignerId" INT NOT NULL,
  "assigneeId" INT NOT NULL,
  "dueDate" TIMESTAMP NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Task_clientId_fkey')
  THEN ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE SET NULL ON UPDATE CASCADE; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Task_projectId_fkey')
  THEN ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE SET NULL ON UPDATE CASCADE; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Task_assignerId_fkey')
  THEN ALTER TABLE "Task" ADD CONSTRAINT "Task_assignerId_fkey"
    FOREIGN KEY ("assignerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Task_assigneeId_fkey')
  THEN ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE; END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Task_assignee_dueDate_idx"
  ON "Task"("assigneeId","dueDate");