import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  AddTeamMemberParams,
  AddTeamMemberResponse,
  CreateTeamBody,
  CreateTeamResponse,
  DeleteTeamParams,
  ListTeamsResponse,
  RemoveTeamMemberParams,
  RemoveTeamMemberResponse,
  UpdateTeamBody,
  UpdateTeamParams,
  UpdateTeamResponse,
} from "@workspace/api-zod";
import {
  db,
  teamsTable,
  teamMembersTable,
  teammatesTable,
  type TeamRow,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

async function loadTeammateIds(
  userId: string,
  teamIds: string[],
): Promise<Map<string, string[]>> {
  const grouped = new Map<string, string[]>();
  if (teamIds.length === 0) return grouped;

  const rows = await db
    .select({
      teamId: teamMembersTable.teamId,
      teammateId: teamMembersTable.teammateId,
    })
    .from(teamMembersTable)
    .innerJoin(teamsTable, eq(teamsTable.id, teamMembersTable.teamId))
    .where(
      and(eq(teamsTable.userId, userId), inArray(teamMembersTable.teamId, teamIds)),
    );

  for (const row of rows) {
    const list = grouped.get(row.teamId) ?? [];
    list.push(row.teammateId);
    grouped.set(row.teamId, list);
  }
  return grouped;
}

function serializeTeam(row: TeamRow, teammateIds: string[]) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    teammateIds,
  };
}

async function loadTeam(userId: string, teamId: string) {
  const [row] = await db
    .select()
    .from(teamsTable)
    .where(and(eq(teamsTable.id, teamId), eq(teamsTable.userId, userId)))
    .limit(1);
  if (!row) return null;
  const map = await loadTeammateIds(userId, [teamId]);
  return serializeTeam(row, map.get(teamId) ?? []);
}

router.get("/teams", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  try {
    const rows = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.userId, userId))
      .orderBy(asc(teamsTable.createdAt));
    const map = await loadTeammateIds(
      userId,
      rows.map((r) => r.id),
    );
    res.json(
      ListTeamsResponse.parse(
        rows.map((row) => serializeTeam(row, map.get(row.id) ?? [])),
      ),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to list teams");
    res.status(500).json({ error: "Failed to list teams" });
  }
});

router.post("/teams", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const body = CreateTeamBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const id = `team${randomUUID()}`;
    const [row] = await db
      .insert(teamsTable)
      .values({
        id,
        userId,
        name: body.data.name.trim(),
        description: body.data.description?.trim() ?? "",
      })
      .returning();
    res.json(CreateTeamResponse.parse(serializeTeam(row, [])));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create team");
    res.status(500).json({ error: "Failed to create team" });
  }
});

router.patch("/teams/:teamId", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const params = UpdateTeamParams.safeParse(req.params);
  const body = UpdateTeamBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Partial<TeamRow> = {};
    if (body.data.name !== undefined) updates.name = body.data.name.trim();
    if (body.data.description !== undefined)
      updates.description = body.data.description.trim();
    if (Object.keys(updates).length > 0) {
      const result = await db
        .update(teamsTable)
        .set(updates)
        .where(
          and(eq(teamsTable.id, params.data.teamId), eq(teamsTable.userId, userId)),
        )
        .returning({ id: teamsTable.id });
      if (result.length === 0) {
        res.status(404).json({ error: "Team not found" });
        return;
      }
    }
    const team = await loadTeam(userId, params.data.teamId);
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    res.json(UpdateTeamResponse.parse(team));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update team");
    res.status(500).json({ error: "Failed to update team" });
  }
});

router.delete("/teams/:teamId", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const params = DeleteTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const result = await db
      .delete(teamsTable)
      .where(
        and(eq(teamsTable.id, params.data.teamId), eq(teamsTable.userId, userId)),
      )
      .returning({ id: teamsTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete team");
    res.status(500).json({ error: "Failed to delete team" });
  }
});

router.post("/teams/:teamId/members/:teammateId", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const params = AddTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const team = await loadTeam(userId, params.data.teamId);
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    const [mate] = await db
      .select({ id: teammatesTable.id })
      .from(teammatesTable)
      .where(
        and(
          eq(teammatesTable.id, params.data.teammateId),
          eq(teammatesTable.userId, userId),
        ),
      )
      .limit(1);
    if (!mate) {
      res.status(404).json({ error: "Teammate not found" });
      return;
    }
    await db
      .insert(teamMembersTable)
      .values({ teamId: params.data.teamId, teammateId: params.data.teammateId })
      .onConflictDoNothing();
    const updated = await loadTeam(userId, params.data.teamId);
    res.json(AddTeamMemberResponse.parse(updated));
  } catch (error) {
    req.log.error({ err: error }, "Failed to add team member");
    res.status(500).json({ error: "Failed to add team member" });
  }
});

router.delete("/teams/:teamId/members/:teammateId", async (req, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const params = RemoveTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const team = await loadTeam(userId, params.data.teamId);
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    await db
      .delete(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, params.data.teamId),
          eq(teamMembersTable.teammateId, params.data.teammateId),
        ),
      );
    const updated = await loadTeam(userId, params.data.teamId);
    res.json(RemoveTeamMemberResponse.parse(updated));
  } catch (error) {
    req.log.error({ err: error }, "Failed to remove team member");
    res.status(500).json({ error: "Failed to remove team member" });
  }
});

export default router;
