import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  discipline: text("discipline").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("Backlog"),
  previousStatus: text("previous_status"),
  dependencies: jsonb("dependencies")
    .$type<string[]>()
    .notNull()
    .default([]),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TaskRow = typeof tasksTable.$inferSelect;
export type InsertTaskRow = typeof tasksTable.$inferInsert;
