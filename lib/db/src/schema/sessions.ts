import { jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

// Mirrors the table layout used by `connect-pg-simple`. We declare it
// explicitly in Drizzle so it shows up in our migrations and isn't
// silently created on first request.
export const sessionsTable = pgTable(
  "session",
  {
    sid: text("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire", { mode: "date", precision: 6 }).notNull(),
  },
  (t) => ({
    expireIdx: index("IDX_session_expire").on(t.expire),
  }),
);

export type SessionRow = typeof sessionsTable.$inferSelect;
