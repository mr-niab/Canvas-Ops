import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateLogEntryBody,
  CreateLogEntryResponse,
  ListLogEntriesResponse,
} from "@workspace/api-zod";
import { db, logEntriesTable, type LogEntryRow } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

function serialize(row: LogEntryRow) {
  return {
    id: row.id,
    date: row.date,
    actor: row.actor,
    type: row.type,
    typeClass: row.typeClass,
    detail: row.detail,
  };
}

router.get("/log-entries", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  try {
    const rows = await db
      .select()
      .from(logEntriesTable)
      .where(eq(logEntriesTable.userId, userId))
      .orderBy(desc(logEntriesTable.createdAt));
    res.json(ListLogEntriesResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list log entries");
    res.status(500).json({ error: "Failed to list log entries" });
  }
});

router.post("/log-entries", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const body = CreateLogEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [row] = await db
      .insert(logEntriesTable)
      .values({
        id: `l${randomUUID()}`,
        userId,
        date: body.data.date.trim(),
        actor: body.data.actor.trim(),
        type: body.data.type.trim(),
        typeClass: body.data.typeClass.trim(),
        detail: body.data.detail.trim(),
      })
      .returning();
    res.json(CreateLogEntryResponse.parse(serialize(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create log entry");
    res.status(500).json({ error: "Failed to create log entry" });
  }
});

router.delete("/log-entries/:logEntryId", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const { logEntryId } = req.params;
  try {
    const [row] = await db
      .delete(logEntriesTable)
      .where(
        and(
          eq(logEntriesTable.id, logEntryId),
          eq(logEntriesTable.userId, userId),
        ),
      )
      .returning({ id: logEntriesTable.id });
    if (!row) {
      res.status(404).json({ error: "Log entry not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete log entry");
    res.status(500).json({ error: "Failed to delete log entry" });
  }
});

export default router;
