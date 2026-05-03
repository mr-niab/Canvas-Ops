import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { usersTable } from "./users";

export const actionsTable = pgTable(
  "actions",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    actionsOrgUserIdx: index("actions_org_user_idx").on(
      t.organisationId,
      t.userId,
    ),
  }),
);

export type ActionRow = typeof actionsTable.$inferSelect;
export type InsertActionRow = typeof actionsTable.$inferInsert;
