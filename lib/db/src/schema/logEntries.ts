import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { projectsTable } from "./projects";

export const logEntriesTable = pgTable("log_entries", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .references(() => projectsTable.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  actor: text("actor").notNull(),
  type: text("type").notNull(),
  typeClass: text("type_class").notNull().default("disc"),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LogEntryRow = typeof logEntriesTable.$inferSelect;
export type InsertLogEntryRow = typeof logEntriesTable.$inferInsert;
