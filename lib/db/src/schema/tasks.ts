import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { projectsTable } from "./projects";

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .references(() => projectsTable.id, { onDelete: "set null" }),
  discipline: text("discipline").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("Backlog"),
  previousStatus: text("previous_status"),
  dependencies: jsonb("dependencies")
    .$type<string[]>()
    .notNull()
    .default([]),
  position: integer("position").notNull().default(0),
  priority: text("priority"),
  assignee: text("assignee"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TaskRow = typeof tasksTable.$inferSelect;
export type InsertTaskRow = typeof tasksTable.$inferInsert;
