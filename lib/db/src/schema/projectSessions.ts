import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { projectsTable } from "./projects";

export const projectSessionsTable = pgTable("project_sessions", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  attendees: text("attendees").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProjectSessionRow = typeof projectSessionsTable.$inferSelect;
export type InsertProjectSessionRow =
  typeof projectSessionsTable.$inferInsert;
