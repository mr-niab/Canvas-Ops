import { Router, type IRouter, type Response } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import {
  CancelInviteParams,
  CreateInviteBody,
  CreateInviteResponse,
  GetOrganisationResponse,
  ListInvitesResponse,
  ListMembersResponse,
  RemoveMemberParams,
  UpdateOrganisationBody,
  UpdateOrganisationResponse,
} from "@workspace/api-zod";
import {
  db,
  invitesTable,
  membershipsTable,
  organisationsTable,
  usersTable,
  type MembershipRole,
} from "@workspace/db";
import {
  requireAuth,
  requireOwner,
  type AuthedRequest,
} from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

router.get("/organisation", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  try {
    const [org] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId))
      .limit(1);
    if (!org) {
      res.status(404).json({ error: "Organisation not found" });
      return;
    }
    res.json(GetOrganisationResponse.parse({ id: org.id, name: org.name }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load organisation");
    res.status(500).json({ error: "Failed to load organisation" });
  }
});

router.patch("/organisation", requireOwner, async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  const body = UpdateOrganisationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [updated] = await db
      .update(organisationsTable)
      .set({ name: body.data.name.trim() })
      .where(eq(organisationsTable.id, organisationId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Organisation not found" });
      return;
    }
    res.json(UpdateOrganisationResponse.parse({ id: updated.id, name: updated.name }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update organisation");
    res.status(500).json({ error: "Failed to update organisation" });
  }
});

router.get("/organisation/members", async (req, res: Response) => {
  const organisationId = (req as AuthedRequest).organisationId;
  try {
    const rows = await db
      .select({
        userId: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: membershipsTable.role,
        joinedAt: membershipsTable.createdAt,
      })
      .from(membershipsTable)
      .innerJoin(usersTable, eq(usersTable.id, membershipsTable.userId))
      .where(eq(membershipsTable.organisationId, organisationId))
      .orderBy(asc(membershipsTable.createdAt));
    res.json(
      ListMembersResponse.parse(
        rows.map((row) => ({
          userId: row.userId,
          email: row.email,
          name: row.name,
          role: row.role as MembershipRole,
          joinedAt: row.joinedAt.toISOString(),
        })),
      ),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to list members");
    res.status(500).json({ error: "Failed to list members" });
  }
});

router.delete(
  "/organisation/members/:userId",
  requireOwner,
  async (req, res: Response) => {
    const organisationId = (req as AuthedRequest).organisationId;
    const actorId = (req as AuthedRequest).userId;
    const params = RemoveMemberParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const targetId = params.data.userId;

    try {
      const [target] = await db
        .select({ role: membershipsTable.role })
        .from(membershipsTable)
        .where(
          and(
            eq(membershipsTable.organisationId, organisationId),
            eq(membershipsTable.userId, targetId),
          ),
        )
        .limit(1);
      if (!target) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      // Prevent removing the last owner so the org always has someone in
      // charge. The acting owner can demote themselves only after promoting
      // someone else (future feature).
      if (target.role === "owner") {
        const owners = await db
          .select({ userId: membershipsTable.userId })
          .from(membershipsTable)
          .where(
            and(
              eq(membershipsTable.organisationId, organisationId),
              eq(membershipsTable.role, "owner"),
            ),
          );
        if (owners.length <= 1) {
          res
            .status(400)
            .json({ error: "Cannot remove the last owner of the organisation" });
          return;
        }
      }

      if (targetId === actorId) {
        res.status(400).json({ error: "You cannot remove yourself" });
        return;
      }

      await db
        .delete(membershipsTable)
        .where(
          and(
            eq(membershipsTable.organisationId, organisationId),
            eq(membershipsTable.userId, targetId),
          ),
        );
      res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, "Failed to remove member");
      res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

router.get(
  "/organisation/invites",
  requireOwner,
  async (req, res: Response) => {
    const organisationId = (req as AuthedRequest).organisationId;
    try {
      const now = new Date();
      const rows = await db
        .select()
        .from(invitesTable)
        .where(
          and(
            eq(invitesTable.organisationId, organisationId),
            isNull(invitesTable.acceptedAt),
            gt(invitesTable.expiresAt, now),
          ),
        )
        .orderBy(desc(invitesTable.createdAt));
      res.json(
        ListInvitesResponse.parse(
          rows.map((row) => ({
            id: row.id,
            email: row.email,
            role: row.role as MembershipRole,
            invitedBy: row.invitedBy,
            createdAt: row.createdAt.toISOString(),
            expiresAt: row.expiresAt.toISOString(),
          })),
        ),
      );
    } catch (error) {
      req.log.error({ err: error }, "Failed to list invites");
      res.status(500).json({ error: "Failed to list invites" });
    }
  },
);

router.post(
  "/organisation/invites",
  requireOwner,
  async (req, res: Response) => {
    const organisationId = (req as AuthedRequest).organisationId;
    const actorId = (req as AuthedRequest).userId;
    const body = CreateInviteBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const email = body.data.email.trim().toLowerCase();
    if (!email.includes("@")) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }
    const role = (body.data.role ?? "member") as MembershipRole;

    try {
      // Refuse to invite users who are already members of this org.
      const [existingMember] = await db
        .select({ userId: membershipsTable.userId })
        .from(membershipsTable)
        .innerJoin(usersTable, eq(usersTable.id, membershipsTable.userId))
        .where(
          and(
            eq(membershipsTable.organisationId, organisationId),
            eq(usersTable.email, email),
          ),
        )
        .limit(1);
      if (existingMember) {
        res.status(400).json({ error: "User is already a member" });
        return;
      }

      // Token doubles as the row id; 32 hex chars is plenty for a one-shot
      // unguessable invite link.
      const token = `inv_${randomBytes(16).toString("hex")}_${randomUUID().slice(0, 8)}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
      const [created] = await db
        .insert(invitesTable)
        .values({
          id: token,
          organisationId,
          email,
          role,
          invitedBy: actorId,
          expiresAt,
        })
        .returning();

      res.json(
        CreateInviteResponse.parse({
          id: created.id,
          email: created.email,
          role: created.role as MembershipRole,
          invitedBy: created.invitedBy,
          createdAt: created.createdAt.toISOString(),
          expiresAt: created.expiresAt.toISOString(),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Failed to create invite");
      res.status(500).json({ error: "Failed to create invite" });
    }
  },
);

router.delete(
  "/organisation/invites/:inviteId",
  requireOwner,
  async (req, res: Response) => {
    const organisationId = (req as AuthedRequest).organisationId;
    const params = CancelInviteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    try {
      const result = await db
        .delete(invitesTable)
        .where(
          and(
            eq(invitesTable.id, params.data.inviteId),
            eq(invitesTable.organisationId, organisationId),
            isNull(invitesTable.acceptedAt),
          ),
        )
        .returning({ id: invitesTable.id });
      if (result.length === 0) {
        res.status(404).json({ error: "Invite not found" });
        return;
      }
      res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, "Failed to cancel invite");
      res.status(500).json({ error: "Failed to cancel invite" });
    }
  },
);

export default router;
