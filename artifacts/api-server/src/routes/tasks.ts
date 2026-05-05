import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import {
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  DeleteTaskResponse,
  ListTasksResponse,
  MoveTaskBody,
  MoveTaskParams,
  MoveTaskResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";
import { db, tasksTable, type TaskRow } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

type Discipline = "UX/UI Design" | "User Research" | "Service Design";

function serialize(row: TaskRow) {
  return {
    id: row.id,
    projectId: row.projectId ?? null,
    discipline: row.discipline as Discipline,
    title: row.title,
    status: row.status,
    previousStatus: row.previousStatus ?? undefined,
    dependencies: row.dependencies,
    priority: row.priority ?? undefined,
    assignee: row.assignee ?? undefined,
  };
}

async function loadAllForOrg(organisationId: string, projectId?: string): Promise<TaskRow[]> {
  const conditions = projectId
    ? and(eq(tasksTable.organisationId, organisationId), eq(tasksTable.projectId, projectId))
    : eq(tasksTable.organisationId, organisationId);
  return db
    .select()
    .from(tasksTable)
    .where(conditions)
    .orderBy(asc(tasksTable.discipline), asc(tasksTable.position), asc(tasksTable.createdAt));
}

function recomputeBlocked(rows: TaskRow[]): TaskRow[] {
  // Mirror the client-side dependency engine: if any dependency exists and is
  // not "Done", the task is "Blocked" (and we remember its previousStatus so
  // it can be restored when the dependency completes).
  const byId = new Map(rows.map((t) => [t.id, t] as const));
  return rows.map((t) => {
    const next: TaskRow = { ...t, dependencies: [...t.dependencies] };
    const blocked = next.dependencies.some((depId) => {
      const dep = byId.get(depId);
      return dep ? dep.status !== "Done" : false;
    });
    if (blocked) {
      if (next.status !== "Blocked") {
        next.previousStatus = next.status;
        next.status = "Blocked";
      }
    } else if (next.status === "Blocked" && next.previousStatus) {
      next.status = next.previousStatus;
      next.previousStatus = null;
    }
    return next;
  });
}

async function persistRecompute(organisationId: string): Promise<TaskRow[]> {
  const rows = await loadAllForOrg(organisationId);
  const recomputed = recomputeBlocked(rows);
  const changed = recomputed.filter((next, idx) => {
    const prev = rows[idx];
    return (
      prev.status !== next.status || prev.previousStatus !== next.previousStatus
    );
  });
  for (const row of changed) {
    await db
      .update(tasksTable)
      .set({ status: row.status, previousStatus: row.previousStatus })
      .where(eq(tasksTable.id, row.id));
  }
  return recomputed;
}

router.get("/tasks", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  try {
    const rows = await loadAllForOrg(organisationId, projectId);
    res.json(ListTasksResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list tasks");
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

router.post("/tasks", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const existingInLane = await db
      .select({ position: tasksTable.position })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.organisationId, organisationId),
          eq(tasksTable.discipline, body.data.discipline),
        ),
      )
      .orderBy(asc(tasksTable.position));
    const nextPos =
      existingInLane.length === 0
        ? 0
        : existingInLane[existingInLane.length - 1].position + 1;
    await db.insert(tasksTable).values({
      id: `t${randomUUID()}`,
      organisationId,
      projectId: body.data.projectId ?? null,
      discipline: body.data.discipline,
      title: body.data.title.trim(),
      status: body.data.status?.trim() || "Backlog",
      dependencies: body.data.dependencies ?? [],
      position: nextPos,
      priority: body.data.priority ?? null,
      assignee: body.data.assignee ?? null,
    });
    const rows = await persistRecompute(organisationId);
    res.json(CreateTaskResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create task");
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.patch("/tasks/:taskId", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = UpdateTaskParams.safeParse(req.params);
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Partial<TaskRow> = {};
    if (body.data.title !== undefined) updates.title = body.data.title.trim();
    if (body.data.status !== undefined) updates.status = body.data.status.trim();
    if (body.data.discipline !== undefined) updates.discipline = body.data.discipline;
    if (body.data.dependencies !== undefined) {
      updates.dependencies = body.data.dependencies.filter(
        (id) => id !== params.data.taskId,
      );
    }
    if (body.data.priority !== undefined) updates.priority = body.data.priority ?? null;
    if (body.data.assignee !== undefined) updates.assignee = body.data.assignee ?? null;
    if (Object.keys(updates).length > 0) {
      const result = await db
        .update(tasksTable)
        .set(updates)
        .where(
          and(
            eq(tasksTable.id, params.data.taskId),
            eq(tasksTable.organisationId, organisationId),
          ),
        )
        .returning({ id: tasksTable.id });
      if (result.length === 0) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
    }
    const rows = await persistRecompute(organisationId);
    res.json(UpdateTaskResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update task");
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/tasks/:taskId", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const deleted = await db
      .delete(tasksTable)
      .where(
        and(
          eq(tasksTable.id, params.data.taskId),
          eq(tasksTable.organisationId, organisationId),
        ),
      )
      .returning({ id: tasksTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    // Strip references to the deleted task from any dependencies.
    const remaining = await loadAllForOrg(organisationId);
    for (const row of remaining) {
      if (row.dependencies.includes(params.data.taskId)) {
        await db
          .update(tasksTable)
          .set({
            dependencies: row.dependencies.filter((id) => id !== params.data.taskId),
          })
          .where(eq(tasksTable.id, row.id));
      }
    }
    const rows = await persistRecompute(organisationId);
    res.json(DeleteTaskResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete task");
    res.status(500).json({ error: "Failed to delete task" });
  }
});

router.post("/tasks/:taskId/move", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = MoveTaskParams.safeParse(req.params);
  const body = MoveTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const all = await loadAllForOrg(organisationId);
    const moving = all.find((t) => t.id === params.data.taskId);
    if (!moving) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const without = all.filter((t) => t.id !== params.data.taskId);
    const targetLane = without
      .filter((t) => t.discipline === body.data.discipline)
      .sort((a, b) => a.position - b.position);
    const clamped = Math.max(0, Math.min(body.data.targetIndex, targetLane.length));
    targetLane.splice(clamped, 0, { ...moving, discipline: body.data.discipline });

    // Persist new lane positions + the moving task's discipline change.
    if (moving.discipline !== body.data.discipline) {
      await db
        .update(tasksTable)
        .set({ discipline: body.data.discipline })
        .where(eq(tasksTable.id, moving.id));
    }
    for (let i = 0; i < targetLane.length; i++) {
      await db
        .update(tasksTable)
        .set({ position: i })
        .where(eq(tasksTable.id, targetLane[i].id));
    }
    // Renumber the source lane too so positions stay tidy.
    if (moving.discipline !== body.data.discipline) {
      const sourceLane = without
        .filter((t) => t.discipline === moving.discipline)
        .sort((a, b) => a.position - b.position);
      for (let i = 0; i < sourceLane.length; i++) {
        await db
          .update(tasksTable)
          .set({ position: i })
          .where(eq(tasksTable.id, sourceLane[i].id));
      }
    }

    const rows = await persistRecompute(organisationId);
    res.json(MoveTaskResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to move task");
    res.status(500).json({ error: "Failed to move task" });
  }
});

export default router;
