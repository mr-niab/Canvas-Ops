import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const organisationsTable = pgTable("organisations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OrganisationRow = typeof organisationsTable.$inferSelect;
export type InsertOrganisationRow = typeof organisationsTable.$inferInsert;
