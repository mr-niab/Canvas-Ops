ALTER TABLE "stakeholders" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "stakeholders" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;