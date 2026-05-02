import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const teamsTable = pgTable("teams", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TeamRow = typeof teamsTable.$inferSelect;
export type InsertTeamRow = typeof teamsTable.$inferInsert;

export const teammatesTable = pgTable("teammates", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  role: text("role").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TeammateRow = typeof teammatesTable.$inferSelect;
export type InsertTeammateRow = typeof teammatesTable.$inferInsert;

export const teamMembersTable = pgTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teamsTable.id, { onDelete: "cascade" }),
    teammateId: text("teammate_id")
      .notNull()
      .references(() => teammatesTable.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.teammateId] })],
);

export type TeamMemberRow = typeof teamMembersTable.$inferSelect;
export type InsertTeamMemberRow = typeof teamMembersTable.$inferInsert;
