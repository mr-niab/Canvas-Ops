import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";

const PgStore = connectPgSimple(session);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error(
    "SESSION_SECRET must be set. It is required to sign session cookies.",
  );
}

export const sessionMiddleware: ReturnType<typeof session> = session({
  store: new PgStore({
    pool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  name: "canvasops.sid",
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    // Replit's preview proxy terminates TLS; trusting the proxy lets us mark
    // cookies secure in production while keeping dev (http) usable.
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * ONE_DAY_MS,
    path: "/",
  },
});
