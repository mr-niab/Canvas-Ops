import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  GetOrganisationResponse,
  UpdateOrganisationBody,
  UpdateOrganisationResponse,
} from "@workspace/api-zod";
import { db, organisationsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

async function getOrCreateOrganisation(userId: string) {
  const [existing] = await db
    .select()
    .from(organisationsTable)
    .where(eq(organisationsTable.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(organisationsTable)
    .values({ id: `org${randomUUID()}`, userId, name: "My Studio" })
    .returning();
  return created;
}

router.get("/organisation", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  try {
    const org = await getOrCreateOrganisation(userId);
    res.json(GetOrganisationResponse.parse({ id: org.id, name: org.name }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load organisation");
    res.status(500).json({ error: "Failed to load organisation" });
  }
});

router.patch("/organisation", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const body = UpdateOrganisationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const org = await getOrCreateOrganisation(userId);
    const [updated] = await db
      .update(organisationsTable)
      .set({ name: body.data.name.trim() })
      .where(eq(organisationsTable.id, org.id))
      .returning();
    res.json(UpdateOrganisationResponse.parse({ id: updated.id, name: updated.name }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update organisation");
    res.status(500).json({ error: "Failed to update organisation" });
  }
});

export default router;
