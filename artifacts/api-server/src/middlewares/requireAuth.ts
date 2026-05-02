import type { Request, Response, NextFunction } from "express";

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
    }
  }
}

export type AuthedRequest = Request & { userId: string };

/**
 * Middleware that ensures the request has a logged-in user. The user id is
 * attached to `req.userId` so downstream handlers can scope queries.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  req.userId = userId;
  next();
}
