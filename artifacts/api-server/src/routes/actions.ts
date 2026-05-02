import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateActionBody,
  CreateActionResponse,
  ListActionsResponse,
  UpdateActionBody,
  UpdateActionParams,
  UpdateActionResponse,
  DeleteActionParams,
} from "@workspace/api-zod";
import { db, actionsTable, type ActionRow } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

function serialize(row: ActionRow) {
  return {
    id: row.id,
    title: row.title,
    note: row.note ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/actions", async (req, res: Response) => {
  const { organisationId, userId } = req as AuthedRequest;
  try {
    const rows = await db
      .select()
      .from(actionsTable)
      .where(
        and(
          eq(actionsTable.organisationId, organisationId),
          eq(actionsTable.userId, userId),
        ),
      )
      .orderBy(desc(actionsTable.createdAt));
    res.json(ListActionsResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list actions");
    res.status(500).json({ error: "Failed to list actions" });
  }
});

router.post("/actions", async (req, res: Response) => {
  const { organisationId, userId } = req as AuthedRequest;
  const body = CreateActionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const title = body.data.title.trim();
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  try {
    const note = body.data.note?.trim() || null;
    const [row] = await db
      .insert(actionsTable)
      .values({
        id: `a${randomUUID()}`,
        organisationId,
        userId,
        title,
        note,
      })
      .returning();
    res.json(CreateActionResponse.parse(serialize(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create action");
    res.status(500).json({ error: "Failed to create action" });
  }
});

router.patch("/actions/:actionId", async (req, res: Response) => {
  const { organisationId, userId } = req as AuthedRequest;
  const params = UpdateActionParams.safeParse(req.params);
  const body = UpdateActionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (body.data.title !== undefined && !body.data.title.trim()) {
    res.status(400).json({ error: "Title cannot be empty" });
    return;
  }
  try {
    const updates: Partial<ActionRow> = { updatedAt: new Date() };
    if (body.data.title !== undefined) updates.title = body.data.title.trim();
    if (body.data.note !== undefined) {
      const next = body.data.note?.trim();
      updates.note = next ? next : null;
    }
    const [row] = await db
      .update(actionsTable)
      .set(updates)
      .where(
        and(
          eq(actionsTable.id, params.data.actionId),
          eq(actionsTable.organisationId, organisationId),
          eq(actionsTable.userId, userId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Action not found" });
      return;
    }
    res.json(UpdateActionResponse.parse(serialize(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update action");
    res.status(500).json({ error: "Failed to update action" });
  }
});

router.delete("/actions/:actionId", async (req, res: Response) => {
  const { organisationId, userId } = req as AuthedRequest;
  const params = DeleteActionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const [row] = await db
      .delete(actionsTable)
      .where(
        and(
          eq(actionsTable.id, params.data.actionId),
          eq(actionsTable.organisationId, organisationId),
          eq(actionsTable.userId, userId),
        ),
      )
      .returning({ id: actionsTable.id });
    if (!row) {
      res.status(404).json({ error: "Action not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete action");
    res.status(500).json({ error: "Failed to delete action" });
  }
});

export default router;
