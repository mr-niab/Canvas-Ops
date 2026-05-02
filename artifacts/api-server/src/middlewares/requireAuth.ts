import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  membershipsTable,
  organisationsTable,
  type MembershipRole,
} from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Authenticated user id, set by `requireAuth`. Always present on routes
       * mounted behind that middleware; `undefined` elsewhere.
       */
      userId?: string;
      /**
       * The organisation the authenticated user is acting on behalf of.
       * Set by `requireAuth` from the user's membership row.
       */
      organisationId?: string;
      /**
       * The authenticated user's role within `organisationId`.
       * Set by `requireAuth`. Use `requireOwner` to gate destructive routes.
       */
      role?: MembershipRole;
    }
  }
}

export type AuthedRequest = Request & {
  userId: string;
  organisationId: string;
  role: MembershipRole;
};

/**
 * Middleware that ensures the request has a logged-in user and a current
 * organisation membership. The user id, org id, and role are attached to the
 * request so downstream handlers can scope queries by `organisationId`.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  try {
    const [membership] = await db
      .select({
        organisationId: membershipsTable.organisationId,
        role: membershipsTable.role,
      })
      .from(membershipsTable)
      .innerJoin(
        organisationsTable,
        eq(organisationsTable.id, membershipsTable.organisationId),
      )
      .where(eq(membershipsTable.userId, userId))
      .limit(1);
    if (!membership) {
      res.status(403).json({ error: "No organisation membership" });
      return;
    }
    req.userId = userId;
    req.organisationId = membership.organisationId;
    req.role = membership.role;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Failed to resolve organisation membership");
    res.status(500).json({ error: "Failed to resolve membership" });
  }
}

/**
 * Middleware that gates a route to organisation owners only. Must be mounted
 * after `requireAuth`.
 */
export function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const role = (req as AuthedRequest).role;
  if (role !== "owner") {
    res.status(403).json({ error: "Owner role required" });
    return;
  }
  next();
}
