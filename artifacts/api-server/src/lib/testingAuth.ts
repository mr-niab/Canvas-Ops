import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, organisationsTable } from "@workspace/db";
import { logger } from "./logger";

export const PLACEHOLDER_USER_ID = "placeholder-user";
const PLACEHOLDER_USER_EMAIL = "test@canvasops.local";
const PLACEHOLDER_USER_NAME = "Test User";
const PLACEHOLDER_ORG_ID = "placeholder-org";
const PLACEHOLDER_ORG_NAME = "Test Studio";

const PLACEHOLDER_PASSWORD_HASH =
  "$2b$12$disabledplaceholderpasswordhashvaluexxxxxxxxxxxxxxxxxxxx";

export const isTestingAuthEnabled = (): boolean =>
  process.env.ENABLE_TESTING_AUTH === "true";

export async function ensurePlaceholderUser(): Promise<void> {
  if (!isTestingAuthEnabled()) return;

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, PLACEHOLDER_USER_ID))
    .limit(1);

  if (!existingUser) {
    await db
      .insert(usersTable)
      .values({
        id: PLACEHOLDER_USER_ID,
        email: PLACEHOLDER_USER_EMAIL,
        name: PLACEHOLDER_USER_NAME,
        passwordHash: PLACEHOLDER_PASSWORD_HASH,
      })
      .onConflictDoNothing({ target: usersTable.id });
  }

  const [existingOrg] = await db
    .select({ id: organisationsTable.id })
    .from(organisationsTable)
    .where(eq(organisationsTable.userId, PLACEHOLDER_USER_ID))
    .limit(1);

  if (!existingOrg) {
    await db
      .insert(organisationsTable)
      .values({
        id: PLACEHOLDER_ORG_ID,
        userId: PLACEHOLDER_USER_ID,
        name: PLACEHOLDER_ORG_NAME,
      })
      .onConflictDoNothing({ target: organisationsTable.userId });
  }

  logger.info(
    { userId: PLACEHOLDER_USER_ID },
    "Testing auth enabled: placeholder user is signed in for all requests",
  );
}

export function attachPlaceholderSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!isTestingAuthEnabled()) {
    next();
    return;
  }
  if (req.session && !req.session.userId) {
    req.session.userId = PLACEHOLDER_USER_ID;
  }
  next();
}
