-- Migration: add Task table (minimal, UTF-8)

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

CREATE INDEX IF NOT EXISTS "Task_assignee_dueDate_idx"
  ON "Task"("assigneeId","dueDate");
