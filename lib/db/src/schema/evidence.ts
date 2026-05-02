import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const evidenceFilesTable = pgTable("evidence_files", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  addedBy: text("added_by").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  objectPath: text("object_path").notNull(),
});

export type EvidenceFileRow = typeof evidenceFilesTable.$inferSelect;
export type InsertEvidenceFileRow = typeof evidenceFilesTable.$inferInsert;

export const linkedBoardsTable = pgTable("linked_boards", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull(),
  provider: text("provider").notNull(),
  url: text("url").notNull(),
  embedUrl: text("embed_url").notNull(),
  title: text("title").notNull(),
  linkedBy: text("linked_by").notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LinkedBoardRow = typeof linkedBoardsTable.$inferSelect;
export type InsertLinkedBoardRow = typeof linkedBoardsTable.$inferInsert;
