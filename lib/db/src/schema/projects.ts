import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { teamsTable } from "./teams";

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  meta: text("meta").notNull().default(""),
  stage: text("stage").notNull().default("Intake"),
  stageClass: text("stage_class").notNull().default("disc"),
  status: text("status").notNull().default("On track"),
  statusClass: text("status_class").notNull().default("good"),
  teamId: text("team_id").references(() => teamsTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProjectRow = typeof projectsTable.$inferSelect;
export type InsertProjectRow = typeof projectsTable.$inferInsert;
