import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import {
  CreateProjectBody,
  CreateProjectResponse,
  DeleteProjectParams,
  ListProjectsResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import { db, projectsTable, teamsTable, type ProjectRow } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

type Stage = "Intake" | "Discovery" | "Alpha" | "Beta" | "Live";

const STAGE_CLASS: Record<Stage, string> = {
  Intake: "disc",
  Discovery: "disc",
  Alpha: "alpha",
  Beta: "beta",
  Live: "good",
};

function serialize(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    meta: row.meta,
    stage: row.stage,
    stageClass: row.stageClass,
    status: row.status,
    statusClass: row.statusClass,
    teamId: row.teamId,
  };
}

async function ensureTeamInOrg(
  organisationId: string,
  teamId: string | null | undefined,
): Promise<boolean> {
  if (teamId === null || teamId === undefined) return true;
  const [row] = await db
    .select({ id: teamsTable.id })
    .from(teamsTable)
    .where(and(eq(teamsTable.id, teamId), eq(teamsTable.organisationId, organisationId)))
    .limit(1);
  return Boolean(row);
}

router.get("/projects", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  try {
    const rows = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.organisationId, organisationId))
      .orderBy(asc(projectsTable.createdAt));
    res.json(ListProjectsResponse.parse(rows.map(serialize)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list projects");
    res.status(500).json({ error: "Failed to list projects" });
  }
});

router.post("/projects", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    if (!(await ensureTeamInOrg(organisationId, body.data.teamId))) {
      res.status(400).json({ error: "Invalid team" });
      return;
    }
    const stage = (body.data.stage ?? "Intake") as Stage;
    const id = `p${randomUUID()}`;
    const [row] = await db
      .insert(projectsTable)
      .values({
        id,
        organisationId,
        name: body.data.name.trim(),
        meta: body.data.meta?.trim() || "New project",
        stage,
        stageClass: STAGE_CLASS[stage],
        status: stage === "Live" ? "Shipped" : "On track",
        statusClass: "good",
        teamId: body.data.teamId ?? null,
      })
      .returning();
    res.json(CreateProjectResponse.parse(serialize(row)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create project");
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.patch("/projects/:projectId", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    if (
      body.data.teamId !== undefined &&
      !(await ensureTeamInOrg(organisationId, body.data.teamId))
    ) {
      res.status(400).json({ error: "Invalid team" });
      return;
    }
    const updates: Partial<ProjectRow> = {};
    if (body.data.name !== undefined) updates.name = body.data.name.trim();
    if (body.data.meta !== undefined) updates.meta = body.data.meta.trim();
    if (body.data.stage !== undefined) {
      const stage = body.data.stage as Stage;
      updates.stage = stage;
      updates.stageClass = STAGE_CLASS[stage];
      if (stage === "Live") updates.status = "Shipped";
    }
    if (body.data.teamId !== undefined) updates.teamId = body.data.teamId;

    const [updated] =
      Object.keys(updates).length > 0
        ? await db
            .update(projectsTable)
            .set(updates)
            .where(
              and(
                eq(projectsTable.id, params.data.projectId),
                eq(projectsTable.organisationId, organisationId),
              ),
            )
            .returning()
        : await db
            .select()
            .from(projectsTable)
            .where(
              and(
                eq(projectsTable.id, params.data.projectId),
                eq(projectsTable.organisationId, organisationId),
              ),
            )
            .limit(1);
    if (!updated) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(UpdateProjectResponse.parse(serialize(updated)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update project");
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:projectId", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const result = await db
      .delete(projectsTable)
      .where(
        and(
          eq(projectsTable.id, params.data.projectId),
          eq(projectsTable.organisationId, organisationId),
        ),
      )
      .returning({ id: projectsTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete project");
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
