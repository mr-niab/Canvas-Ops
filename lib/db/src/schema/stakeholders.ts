import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";

export const stakeholdersTable = pgTable("stakeholders", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  email: text("email").notNull().default(""),
  lastContacted: text("last_contacted").notNull().default("—"),
  status: text("status").notNull().default("Not contacted"),
  statusClass: text("status_class").notNull().default("blocked"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type StakeholderRow = typeof stakeholdersTable.$inferSelect;
export type InsertStakeholderRow = typeof stakeholdersTable.$inferInsert;
