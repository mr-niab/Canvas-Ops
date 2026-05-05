ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "priority" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignee" text;
