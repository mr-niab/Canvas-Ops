import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gte } from "drizzle-orm";
import {
  CreateProjectSessionBody,
  CreateProjectSessionParams,
  CreateProjectSessionResponse,
  DeleteProjectSessionParams,
  ListProjectSessionsParams,
  ListProjectSessionsResponse,
  ListUpcomingSessionsResponse,
  UpdateProjectSessionBody,
  UpdateProjectSessionParams,
  UpdateProjectSessionResponse,
} from "@workspace/api-zod";
import {
  db,
  projectSessionsTable,
  projectsTable,
  type ProjectSessionRow,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

function serialize(row: ProjectSessionRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    scheduledAt: row.scheduledAt,
    attendees: row.attendees,
    notes: row.notes,
  };
}

async function ensureProjectInOrg(
  organisationId: string,
  projectId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.id, projectId),
        eq(projectsTable.organisationId, organisationId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

router.get("/projects/:projectId/sessions", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = ListProjectSessionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    if (!(await ensureProjectInOrg(organisationId, params.data.projectId))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const now = new Date();
    const rows = await db
      .select()
      .from(projectSessionsTable)
      .where(
        and(
          eq(projectSessionsTable.organisationId, organisationId),
          eq(projectSessionsTable.projectId, params.data.projectId),
          gte(projectSessionsTable.scheduledAt, now),
        ),
      )
      .orderBy(asc(projectSessionsTable.scheduledAt));
    res.json(ListProjectSessionsResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list project sessions");
    res.status(500).json({ error: "Failed to list project sessions" });
  }
});

router.post("/projects/:projectId/sessions", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = CreateProjectSessionParams.safeParse(req.params);
  const body = CreateProjectSessionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    if (!(await ensureProjectInOrg(organisationId, params.data.projectId))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [row] = await db
      .insert(projectSessionsTable)
      .values({
        id: `ps${randomUUID()}`,
        organisationId,
        projectId: params.data.projectId,
        title: body.data.title.trim(),
        scheduledAt: body.data.scheduledAt,
        attendees: (body.data.attendees ?? "").trim(),
        notes: (body.data.notes ?? "").trim(),
      })
      .returning();
    res.json(CreateProjectSessionResponse.parse(serialize(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create project session");
    res.status(500).json({ error: "Failed to create project session" });
  }
});

router.patch(
  "/projects/:projectId/sessions/:sessionId",
  async (req, res: Response) => {
    const organisationId = (req as AuthedRequest).organisationId;
    const params = UpdateProjectSessionParams.safeParse(req.params);
    const body = UpdateProjectSessionBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    try {
      const updates: Partial<typeof projectSessionsTable.$inferInsert> = {};
      if (body.data.title !== undefined) updates.title = body.data.title.trim();
      if (body.data.scheduledAt !== undefined)
        updates.scheduledAt = body.data.scheduledAt;
      if (body.data.attendees !== undefined)
        updates.attendees = body.data.attendees.trim();
      if (body.data.notes !== undefined) updates.notes = body.data.notes.trim();

      const [row] =
        Object.keys(updates).length > 0
          ? await db
              .update(projectSessionsTable)
              .set(updates)
              .where(
                and(
                  eq(projectSessionsTable.id, params.data.sessionId),
                  eq(projectSessionsTable.projectId, params.data.projectId),
                  eq(projectSessionsTable.organisationId, organisationId),
                ),
              )
              .returning()
          : await db
              .select()
              .from(projectSessionsTable)
              .where(
                and(
                  eq(projectSessionsTable.id, params.data.sessionId),
                  eq(projectSessionsTable.projectId, params.data.projectId),
                  eq(projectSessionsTable.organisationId, organisationId),
                ),
              )
              .limit(1);
      if (!row) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      res.json(UpdateProjectSessionResponse.parse(serialize(row)));
    } catch (error) {
      req.log.error({ err: error }, "Failed to update project session");
      res.status(500).json({ error: "Failed to update project session" });
    }
  },
);

router.delete(
  "/projects/:projectId/sessions/:sessionId",
  async (req, res: Response) => {
    const organisationId = (req as AuthedRequest).organisationId;
    const params = DeleteProjectSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    try {
      const [row] = await db
        .delete(projectSessionsTable)
        .where(
          and(
            eq(projectSessionsTable.id, params.data.sessionId),
            eq(projectSessionsTable.projectId, params.data.projectId),
            eq(projectSessionsTable.organisationId, organisationId),
          ),
        )
        .returning({ id: projectSessionsTable.id });
      if (!row) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, "Failed to delete project session");
      res.status(500).json({ error: "Failed to delete project session" });
    }
  },
);

router.get("/upcoming-sessions", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  try {
    const now = new Date();
    const rows = await db
      .select({
        id: projectSessionsTable.id,
        projectId: projectSessionsTable.projectId,
        projectName: projectsTable.name,
        title: projectSessionsTable.title,
        scheduledAt: projectSessionsTable.scheduledAt,
        attendees: projectSessionsTable.attendees,
        notes: projectSessionsTable.notes,
      })
      .from(projectSessionsTable)
      .innerJoin(
        projectsTable,
        eq(projectsTable.id, projectSessionsTable.projectId),
      )
      .where(
        and(
          eq(projectSessionsTable.organisationId, organisationId),
          gte(projectSessionsTable.scheduledAt, now),
        ),
      )
      .orderBy(asc(projectSessionsTable.scheduledAt));
    res.json(ListUpcomingSessionsResponse.parse(rows));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list upcoming sessions");
    res.status(500).json({ error: "Failed to list upcoming sessions" });
  }
});

export default router;
