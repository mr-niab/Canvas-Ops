import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { organisationsTable } from "./organisations";
import { type MembershipRole } from "./memberships";

export const invitesTable = pgTable(
  "invites",
  {
    // The token itself acts as the row id so we can look it up directly
    // when a user follows the invite link.
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").$type<MembershipRole>().notNull().default("member"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: text("accepted_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => [index("invites_org_id_idx").on(table.organisationId)],
);

export type InviteRow = typeof invitesTable.$inferSelect;
export type InsertInviteRow = typeof invitesTable.$inferInsert;
