import { pgTable, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const organisationsTable = pgTable("organisations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  name: text("name").notNull(),
});

export type OrganisationRow = typeof organisationsTable.$inferSelect;
export type InsertOrganisationRow = typeof organisationsTable.$inferInsert;
