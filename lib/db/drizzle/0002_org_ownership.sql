-- Move CanvasOps from per-user ownership to per-organisation ownership.
-- Adds memberships + invites, swaps `user_id` to `organisation_id` on all
-- domain tables, and backfills existing rows so deployed databases keep all
-- their data.

-- 1. Organisations: add createdAt, drop the old per-user uniqueness constraint
ALTER TABLE "organisations" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "organisations" DROP CONSTRAINT IF EXISTS "organisations_user_id_unique";
--> statement-breakpoint

-- 2. memberships
CREATE TABLE "memberships" (
        "organisation_id" text NOT NULL,
        "user_id" text NOT NULL,
        "role" text DEFAULT 'member' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "memberships_organisation_id_user_id_pk" PRIMARY KEY("organisation_id","user_id")
);
--> statement-breakpoint

-- 3. Backfill: each existing organisation owner becomes an "owner" member of
--    that organisation. This preserves access for every signed-in user.
INSERT INTO "memberships" ("organisation_id", "user_id", "role", "created_at")
SELECT "id", "user_id", 'owner', now()
FROM "organisations"
ON CONFLICT DO NOTHING;
--> statement-breakpoint

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- 4. invites
CREATE TABLE "invites" (
        "id" text PRIMARY KEY NOT NULL,
        "organisation_id" text NOT NULL,
        "email" text NOT NULL,
        "role" text DEFAULT 'member' NOT NULL,
        "invited_by" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "accepted_at" timestamp with time zone,
        "accepted_by" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "invites_org_email_pending_idx" ON "invites" ("organisation_id", "email") WHERE "accepted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 5. Swap user_id → organisation_id on every owned table. For each table:
--    a) add nullable organisation_id, b) backfill from organisations.user_id,
--    c) make NOT NULL + add FK, d) drop the old user_id FK + column.

-- teams
ALTER TABLE "teams" ADD COLUMN "organisation_id" text;
--> statement-breakpoint
UPDATE "teams" t SET "organisation_id" = o."id" FROM "organisations" o WHERE o."user_id" = t."user_id";
--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "organisation_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "user_id";
--> statement-breakpoint

-- teammates
ALTER TABLE "teammates" ADD COLUMN "organisation_id" text;
--> statement-breakpoint
UPDATE "teammates" t SET "organisation_id" = o."id" FROM "organisations" o WHERE o."user_id" = t."user_id";
--> statement-breakpoint
ALTER TABLE "teammates" ALTER COLUMN "organisation_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "teammates" ADD CONSTRAINT "teammates_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "teammates" DROP CONSTRAINT IF EXISTS "teammates_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "teammates" DROP COLUMN "user_id";
--> statement-breakpoint

-- projects
ALTER TABLE "projects" ADD COLUMN "organisation_id" text;
--> statement-breakpoint
UPDATE "projects" p SET "organisation_id" = o."id" FROM "organisations" o WHERE o."user_id" = p."user_id";
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "organisation_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "user_id";
--> statement-breakpoint

-- tasks
ALTER TABLE "tasks" ADD COLUMN "organisation_id" text;
--> statement-breakpoint
UPDATE "tasks" t SET "organisation_id" = o."id" FROM "organisations" o WHERE o."user_id" = t."user_id";
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "organisation_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "user_id";
--> statement-breakpoint

-- stakeholders
ALTER TABLE "stakeholders" ADD COLUMN "organisation_id" text;
--> statement-breakpoint
UPDATE "stakeholders" s SET "organisation_id" = o."id" FROM "organisations" o WHERE o."user_id" = s."user_id";
--> statement-breakpoint
ALTER TABLE "stakeholders" ALTER COLUMN "organisation_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stakeholders" DROP CONSTRAINT IF EXISTS "stakeholders_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "stakeholders" DROP COLUMN "user_id";
--> statement-breakpoint

-- log_entries
ALTER TABLE "log_entries" ADD COLUMN "organisation_id" text;
--> statement-breakpoint
UPDATE "log_entries" l SET "organisation_id" = o."id" FROM "organisations" o WHERE o."user_id" = l."user_id";
--> statement-breakpoint
ALTER TABLE "log_entries" ALTER COLUMN "organisation_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "log_entries" DROP CONSTRAINT IF EXISTS "log_entries_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "log_entries" DROP COLUMN "user_id";
--> statement-breakpoint

-- evidence_files
ALTER TABLE "evidence_files" ADD COLUMN "organisation_id" text;
--> statement-breakpoint
UPDATE "evidence_files" e SET "organisation_id" = o."id" FROM "organisations" o WHERE o."user_id" = e."user_id";
--> statement-breakpoint
ALTER TABLE "evidence_files" ALTER COLUMN "organisation_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evidence_files" DROP CONSTRAINT IF EXISTS "evidence_files_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "evidence_files" DROP COLUMN "user_id";
--> statement-breakpoint

-- linked_boards
ALTER TABLE "linked_boards" ADD COLUMN "organisation_id" text;
--> statement-breakpoint
UPDATE "linked_boards" b SET "organisation_id" = o."id" FROM "organisations" o WHERE o."user_id" = b."user_id";
--> statement-breakpoint
ALTER TABLE "linked_boards" ALTER COLUMN "organisation_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "linked_boards" ADD CONSTRAINT "linked_boards_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "linked_boards" DROP CONSTRAINT IF EXISTS "linked_boards_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "linked_boards" DROP COLUMN "user_id";
--> statement-breakpoint

-- 6. Now drop the per-user ownership column on organisations.
ALTER TABLE "organisations" DROP CONSTRAINT IF EXISTS "organisations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "organisations" DROP COLUMN "user_id";
