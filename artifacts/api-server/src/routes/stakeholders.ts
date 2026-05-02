import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import {
  CreateStakeholderBody,
  CreateStakeholderResponse,
  ListStakeholdersResponse,
  UpdateStakeholderBody,
  UpdateStakeholderResponse,
} from "@workspace/api-zod";
import { db, stakeholdersTable, type StakeholderRow } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

function serialize(row: StakeholderRow) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    lastContacted: row.lastContacted,
    status: row.status,
    statusClass: row.statusClass,
  };
}

router.get("/stakeholders", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  try {
    const rows = await db
      .select()
      .from(stakeholdersTable)
      .where(eq(stakeholdersTable.organisationId, organisationId))
      .orderBy(asc(stakeholdersTable.createdAt));
    res.json(ListStakeholdersResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list stakeholders");
    res.status(500).json({ error: "Failed to list stakeholders" });
  }
});

router.post("/stakeholders", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const body = CreateStakeholderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [row] = await db
      .insert(stakeholdersTable)
      .values({
        id: `s${randomUUID()}`,
        organisationId,
        name: body.data.name.trim(),
        role: body.data.role?.trim() ?? "",
        email: body.data.email?.trim() ?? "",
        lastContacted: body.data.lastContacted?.trim() || "—",
        status: body.data.status?.trim() || "Not contacted",
        statusClass: body.data.statusClass?.trim() || "blocked",
      })
      .returning();
    res.json(CreateStakeholderResponse.parse(serialize(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create stakeholder");
    res.status(500).json({ error: "Failed to create stakeholder" });
  }
});

router.patch("/stakeholders/:stakeholderId", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const { stakeholderId } = req.params;
  const body = UpdateStakeholderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const updates: Partial<typeof stakeholdersTable.$inferInsert> = {};
    if (body.data.name !== undefined) updates.name = body.data.name.trim();
    if (body.data.role !== undefined) updates.role = body.data.role.trim();
    if (body.data.email !== undefined) updates.email = body.data.email.trim();
    if (body.data.lastContacted !== undefined)
      updates.lastContacted = body.data.lastContacted.trim() || "—";
    if (body.data.status !== undefined)
      updates.status = body.data.status.trim() || "Not contacted";
    if (body.data.statusClass !== undefined)
      updates.statusClass = body.data.statusClass.trim() || "blocked";

    if (Object.keys(updates).length === 0) {
      const [existing] = await db
        .select()
        .from(stakeholdersTable)
        .where(
          and(
            eq(stakeholdersTable.id, stakeholderId),
            eq(stakeholdersTable.organisationId, organisationId),
          ),
        );
      if (!existing) {
        res.status(404).json({ error: "Stakeholder not found" });
        return;
      }
      res.json(UpdateStakeholderResponse.parse(serialize(existing)));
      return;
    }

    const [row] = await db
      .update(stakeholdersTable)
      .set(updates)
      .where(
        and(
          eq(stakeholdersTable.id, stakeholderId),
          eq(stakeholdersTable.organisationId, organisationId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Stakeholder not found" });
      return;
    }
    res.json(UpdateStakeholderResponse.parse(serialize(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update stakeholder");
    res.status(500).json({ error: "Failed to update stakeholder" });
  }
});

router.delete("/stakeholders/:stakeholderId", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const { stakeholderId } = req.params;
  try {
    const [row] = await db
      .delete(stakeholdersTable)
      .where(
        and(
          eq(stakeholdersTable.id, stakeholderId),
          eq(stakeholdersTable.organisationId, organisationId),
        ),
      )
      .returning({ id: stakeholdersTable.id });
    if (!row) {
      res.status(404).json({ error: "Stakeholder not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete stakeholder");
    res.status(500).json({ error: "Failed to delete stakeholder" });
  }
});

export default router;
