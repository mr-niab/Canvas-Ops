import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const logEntriesTable = pgTable("log_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
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
