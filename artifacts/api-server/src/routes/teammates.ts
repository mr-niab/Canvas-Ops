import { Router, type IRouter, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  CreateTeammateBody,
  CreateTeammateResponse,
  DeleteTeammateParams,
  ListTeammatesResponse,
  UpdateTeammateBody,
  UpdateTeammateParams,
  UpdateTeammateResponse,
} from "@workspace/api-zod";
import {
  db,
  teammatesTable,
  teamMembersTable,
  teamsTable,
  type TeammateRow,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

async function loadTeamIds(
  organisationId: string,
  teammateIds: string[],
): Promise<Map<string, string[]>> {
  const grouped = new Map<string, string[]>();
  if (teammateIds.length === 0) return grouped;
  const rows = await db
    .select({
      teamId: teamMembersTable.teamId,
      teammateId: teamMembersTable.teammateId,
    })
    .from(teamMembersTable)
    .innerJoin(teammatesTable, eq(teammatesTable.id, teamMembersTable.teammateId))
    .where(
      and(
        eq(teammatesTable.organisationId, organisationId),
        inArray(teamMembersTable.teammateId, teammateIds),
      ),
    );
  for (const row of rows) {
    const list = grouped.get(row.teammateId) ?? [];
    list.push(row.teamId);
    grouped.set(row.teammateId, list);
  }
  return grouped;
}

function serializeTeammate(row: TeammateRow, teamIds: string[]) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    teamIds,
  };
}

router.get("/teammates", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  try {
    const rows = await db
      .select()
      .from(teammatesTable)
      .where(eq(teammatesTable.organisationId, organisationId))
      .orderBy(asc(teammatesTable.createdAt));
    const map = await loadTeamIds(
      organisationId,
      rows.map((r) => r.id),
    );
    res.json(
      ListTeammatesResponse.parse(
        rows.map((row) => serializeTeammate(row, map.get(row.id) ?? [])),
      ),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to list teammates");
    res.status(500).json({ error: "Failed to list teammates" });
  }
});

router.post("/teammates", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const body = CreateTeammateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const id = `tm${randomUUID()}`;
    const [row] = await db
      .insert(teammatesTable)
      .values({
        id,
        organisationId,
        name: body.data.name.trim(),
        email: body.data.email?.trim() ?? "",
        role: body.data.role?.trim() ?? "",
      })
      .returning();

    const teamIds = Array.from(new Set(body.data.teamIds ?? []));
    if (teamIds.length > 0) {
      // Only attach to teams in the same organisation.
      const ownedTeams = await db
        .select({ id: teamsTable.id })
        .from(teamsTable)
        .where(and(eq(teamsTable.organisationId, organisationId), inArray(teamsTable.id, teamIds)));
      if (ownedTeams.length > 0) {
        await db
          .insert(teamMembersTable)
          .values(ownedTeams.map((t) => ({ teamId: t.id, teammateId: row.id })))
          .onConflictDoNothing();
      }
    }

    const map = await loadTeamIds(organisationId, [row.id]);
    res.json(CreateTeammateResponse.parse(serializeTeammate(row, map.get(row.id) ?? [])));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create teammate");
    res.status(500).json({ error: "Failed to create teammate" });
  }
});

router.patch("/teammates/:teammateId", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = UpdateTeammateParams.safeParse(req.params);
  const body = UpdateTeammateBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Partial<TeammateRow> = {};
    if (body.data.name !== undefined) updates.name = body.data.name.trim();
    if (body.data.email !== undefined) updates.email = body.data.email.trim();
    if (body.data.role !== undefined) updates.role = body.data.role.trim();

    const [updated] =
      Object.keys(updates).length > 0
        ? await db
            .update(teammatesTable)
            .set(updates)
            .where(
              and(
                eq(teammatesTable.id, params.data.teammateId),
                eq(teammatesTable.organisationId, organisationId),
              ),
            )
            .returning()
        : await db
            .select()
            .from(teammatesTable)
            .where(
              and(
                eq(teammatesTable.id, params.data.teammateId),
                eq(teammatesTable.organisationId, organisationId),
              ),
            )
            .limit(1);
    if (!updated) {
      res.status(404).json({ error: "Teammate not found" });
      return;
    }
    const map = await loadTeamIds(organisationId, [updated.id]);
    res.json(
      UpdateTeammateResponse.parse(serializeTeammate(updated, map.get(updated.id) ?? [])),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to update teammate");
    res.status(500).json({ error: "Failed to update teammate" });
  }
});

router.delete("/teammates/:teammateId", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const params = DeleteTeammateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const result = await db
      .delete(teammatesTable)
      .where(
        and(
          eq(teammatesTable.id, params.data.teammateId),
          eq(teammatesTable.organisationId, organisationId),
        ),
      )
      .returning({ id: teammatesTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Teammate not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete teammate");
    res.status(500).json({ error: "Failed to delete teammate" });
  }
});

export default router;
