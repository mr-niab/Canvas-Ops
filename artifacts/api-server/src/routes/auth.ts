import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  AcceptInviteBody,
  AcceptInviteResponse,
  GetCurrentUserResponse,
  LoginUserBody,
  LoginUserResponse,
  RegisterUserBody,
  RegisterUserResponse,
} from "@workspace/api-zod";
import {
  db,
  invitesTable,
  membershipsTable,
  organisationsTable,
  usersTable,
} from "@workspace/db";

const router: IRouter = Router();

const PASSWORD_SALT_ROUNDS = 12;

async function loadMembership(userId: string) {
  const [row] = await db
    .select({
      organisationId: membershipsTable.organisationId,
      role: membershipsTable.role,
    })
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, userId))
    .limit(1);
  return row ?? null;
}

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

    // Brand-new user → spin up their organisation and make them owner.
    const orgId = `org${randomUUID()}`;
    await db
      .insert(organisationsTable)
      .values({ id: orgId, name: `${name}'s Studio` });
    await db
      .insert(membershipsTable)
      .values({ organisationId: orgId, userId: id, role: "owner" });

    req.session.userId = row.id;
    req.session.save((err) => {
      if (err) {
        req.log.error({ err }, "Failed to persist session after register");
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      res.json(
        RegisterUserResponse.parse({
          id: row.id,
          email: row.email,
          name: row.name,
          role: "owner",
          organisationId: orgId,
        }),
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

    const membership = await loadMembership(user.id);

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
          LoginUserResponse.parse({
            id: user.id,
            email: user.email,
            name: user.name,
            role: membership?.role ?? "member",
            organisationId: membership?.organisationId ?? "",
          }),
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
    res.clearCookie("projectcanvas.sid", { path: "/" });
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
    const membership = await loadMembership(user.id);
    res.json(
      GetCurrentUserResponse.parse({
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership?.role ?? "member",
        organisationId: membership?.organisationId ?? "",
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to fetch current user");
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});

/**
 * Accept an invite by token: registers a new user (or signs them in if their
 * email already exists) and adds them to the inviting organisation.
 */
router.post("/auth/accept-invite", async (req: Request, res: Response) => {
  const body = AcceptInviteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const token = body.data.token.trim();
  const email = body.data.email.trim().toLowerCase();
  const name = body.data.name.trim();
  const password = body.data.password;

  try {
    const now = new Date();
    const [invite] = await db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.id, token),
          isNull(invitesTable.acceptedAt),
          gt(invitesTable.expiresAt, now),
        ),
      )
      .limit(1);
    if (!invite) {
      res.status(404).json({ error: "Invite not found or expired" });
      return;
    }
    if (invite.email.toLowerCase() !== email) {
      res
        .status(400)
        .json({ error: "Email does not match the invited address" });
      return;
    }

    // Create or look up the user. New users get a fresh password; existing
    // users must re-authenticate (we don't trust the invite link to log them
    // into a pre-existing account).
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    let userId: string;
    if (existingUser) {
      const ok = await bcrypt.compare(password, existingUser.passwordHash);
      if (!ok) {
        res.status(401).json({ error: "Invalid password for existing account" });
        return;
      }
      userId = existingUser.id;
      // Existing users can only belong to one org at a time.
      const existingMembership = await loadMembership(userId);
      if (
        existingMembership &&
        existingMembership.organisationId !== invite.organisationId
      ) {
        res.status(400).json({
          error:
            "User already belongs to another organisation. Sign out and use a different email.",
        });
        return;
      }
    } else {
      const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
      userId = `u${randomUUID()}`;
      await db
        .insert(usersTable)
        .values({ id: userId, email, name, passwordHash });
    }

    await db
      .insert(membershipsTable)
      .values({
        organisationId: invite.organisationId,
        userId,
        role: invite.role,
      })
      .onConflictDoNothing();

    await db
      .update(invitesTable)
      .set({ acceptedAt: now, acceptedBy: userId })
      .where(eq(invitesTable.id, invite.id));

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        req.log.error({ err: regenErr }, "Failed to regenerate session on accept-invite");
        res.status(500).json({ error: "Failed to create session" });
        return;
      }
      req.session.userId = userId;
      req.session.save((saveErr) => {
        if (saveErr) {
          req.log.error({ err: saveErr }, "Failed to persist session after accept-invite");
          res.status(500).json({ error: "Failed to create session" });
          return;
        }
        res.json(
          AcceptInviteResponse.parse({
            id: userId,
            email,
            name,
            role: invite.role,
            organisationId: invite.organisationId,
          }),
        );
      });
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to accept invite");
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

export default router;
