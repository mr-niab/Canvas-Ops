import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import {
  GetCurrentUserResponse,
  LoginUserBody,
  LoginUserResponse,
  RegisterUserBody,
  RegisterUserResponse,
} from "@workspace/api-zod";
import { db, usersTable, organisationsTable } from "@workspace/db";

const router: IRouter = Router();

const PASSWORD_SALT_ROUNDS = 12;

router.post("/auth/register", async (req: Request, res: Response) => {
  const body = RegisterUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const email = body.data.email.trim().toLowerCase();
  const name = body.data.name.trim();
  if (!email.includes("@")) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.data.password, PASSWORD_SALT_ROUNDS);
    const id = `u${randomUUID()}`;
    const [row] = await db
      .insert(usersTable)
      .values({ id, email, name, passwordHash })
      .returning();

    // Seed an organisation row for this user so the rest of the app has
    // something to render immediately after sign-up.
    await db
      .insert(organisationsTable)
      .values({ id: `org${randomUUID()}`, userId: id, name: `${name}'s Studio` });

    req.session.userId = row.id;
    req.session.save((err) => {
      if (err) {
        req.log.error({ err }, "Failed to persist session after register");
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      res.json(
        RegisterUserResponse.parse({ id: row.id, email: row.email, name: row.name }),
      );
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to register user");
    res.status(500).json({ error: "Failed to register" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const body = LoginUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const email = body.data.email.trim().toLowerCase();

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const ok = await bcrypt.compare(body.data.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        req.log.error({ err: regenErr }, "Failed to regenerate session on login");
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          req.log.error({ err: saveErr }, "Failed to persist session after login");
          res.status(500).json({ error: "Failed to create session" });
          return;
        }
        res.json(
          LoginUserResponse.parse({ id: user.id, email: user.email, name: user.name }),
        );
      });
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to login user");
    res.status(500).json({ error: "Failed to login" });
  }
});

router.post("/auth/logout", (req: Request, res: Response) => {
  if (!req.session) {
    res.status(204).end();
    return;
  }
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session");
      res.status(500).json({ error: "Failed to sign out" });
      return;
    }
    res.clearCookie("canvasops.sid", { path: "/" });
    res.status(204).end();
  });
});

router.get("/auth/me", async (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      // Stale cookie pointing at a deleted user.
      req.session.destroy(() => {
        res.status(401).json({ error: "Not signed in" });
      });
      return;
    }
    res.json(GetCurrentUserResponse.parse(user));
  } catch (error) {
    req.log.error({ err: error }, "Failed to fetch current user");
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});

export default router;
