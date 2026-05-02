import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateEvidenceFileBody,
  CreateEvidenceFileParams,
  CreateEvidenceFileResponse,
  CreateLinkedBoardBody,
  CreateLinkedBoardParams,
  CreateLinkedBoardResponse,
  DeleteEvidenceFileParams,
  DeleteLinkedBoardParams,
  ListProjectEvidenceParams,
  ListProjectEvidenceResponse,
} from "@workspace/api-zod";
import {
  db,
  evidenceFilesTable,
  linkedBoardsTable,
  type EvidenceFileRow,
  type LinkedBoardRow,
} from "@workspace/db";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  isUploadObjectPath,
} from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function previewUrlFor(objectPath: string): string {
  // Object paths are normalized to `/objects/uploads/<uuid>`. The storage route
  // is mounted at `/api/storage/objects/*`, so we rewrite the leading
  // `/objects/` prefix to point at the public-facing serving endpoint.
  if (objectPath.startsWith("/objects/")) {
    return `/api/storage/objects/${objectPath.slice("/objects/".length)}`;
  }
  return objectPath;
}

function serializeFile(row: EvidenceFileRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    mimeType: row.mimeType,
    size: row.size,
    addedBy: row.addedBy,
    addedAt: row.addedAt.toISOString(),
    objectPath: row.objectPath,
    previewUrl: previewUrlFor(row.objectPath),
  };
}

function serializeBoard(row: LinkedBoardRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    provider: row.provider as "miro" | "figjam",
    url: row.url,
    embedUrl: row.embedUrl,
    title: row.title,
    linkedBy: row.linkedBy,
    linkedAt: row.linkedAt.toISOString(),
  };
}

router.get("/projects/:projectId/evidence", async (req: Request, res: Response) => {
  const params = ListProjectEvidenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [files, boards] = await Promise.all([
      db
        .select()
        .from(evidenceFilesTable)
        .where(eq(evidenceFilesTable.projectId, params.data.projectId))
        .orderBy(desc(evidenceFilesTable.addedAt)),
      db
        .select()
        .from(linkedBoardsTable)
        .where(eq(linkedBoardsTable.projectId, params.data.projectId))
        .orderBy(desc(linkedBoardsTable.linkedAt)),
    ]);

    const payload = ListProjectEvidenceResponse.parse({
      files: files.map(serializeFile),
      boards: boards.map(serializeBoard),
    });
    res.json(payload);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list project evidence");
    res.status(500).json({ error: "Failed to list project evidence" });
  }
});

router.post(
  "/projects/:projectId/evidence/files",
  async (req: Request, res: Response) => {
    const params = CreateEvidenceFileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }
    const body = CreateEvidenceFileBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const objectPath = objectStorageService.normalizeObjectEntityPath(
      body.data.objectPath,
    );
    if (!isUploadObjectPath(objectPath)) {
      // Reject anything that isn't a path produced by our presigned upload
      // flow. This stops a client from registering arbitrary bucket paths
      // (and therefore making them servable through /storage/objects).
      res.status(400).json({ error: "Invalid objectPath" });
      return;
    }

    try {
      const id = `ef${randomUUID()}`;
      const [row] = await db
        .insert(evidenceFilesTable)
        .values({
          id,
          projectId: params.data.projectId,
          name: body.data.name,
          mimeType: body.data.mimeType,
          size: body.data.size,
          addedBy: body.data.addedBy,
          objectPath,
        })
        .returning();

      res.json(CreateEvidenceFileResponse.parse(serializeFile(row)));
    } catch (error) {
      req.log.error({ err: error }, "Failed to persist evidence file");
      res.status(500).json({ error: "Failed to persist evidence file" });
    }
  },
);

router.delete(
  "/projects/:projectId/evidence/files/:fileId",
  async (req: Request, res: Response) => {
    const params = DeleteEvidenceFileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    try {
      const [existing] = await db
        .select()
        .from(evidenceFilesTable)
        .where(
          and(
            eq(evidenceFilesTable.id, params.data.fileId),
            eq(evidenceFilesTable.projectId, params.data.projectId),
          ),
        )
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Evidence file not found" });
        return;
      }

      await db
        .delete(evidenceFilesTable)
        .where(eq(evidenceFilesTable.id, params.data.fileId));

      // Best-effort cleanup of the underlying object. We treat missing files as
      // success so the metadata removal is the source of truth even if the
      // object was already deleted out-of-band.
      try {
        const file = await objectStorageService.getObjectEntityFile(
          existing.objectPath,
        );
        await file.delete({ ignoreNotFound: true });
      } catch (error) {
        if (!(error instanceof ObjectNotFoundError)) {
          req.log.warn(
            { err: error, objectPath: existing.objectPath },
            "Failed to delete object after removing metadata",
          );
        }
      }

      res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, "Failed to delete evidence file");
      res.status(500).json({ error: "Failed to delete evidence file" });
    }
  },
);

router.post(
  "/projects/:projectId/evidence/boards",
  async (req: Request, res: Response) => {
    const params = CreateLinkedBoardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }
    const body = CreateLinkedBoardBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    try {
      const id = `lb${randomUUID()}`;
      const [row] = await db
        .insert(linkedBoardsTable)
        .values({
          id,
          projectId: params.data.projectId,
          provider: body.data.provider,
          url: body.data.url,
          embedUrl: body.data.embedUrl,
          title: body.data.title,
          linkedBy: body.data.linkedBy,
        })
        .returning();

      res.json(CreateLinkedBoardResponse.parse(serializeBoard(row)));
    } catch (error) {
      req.log.error({ err: error }, "Failed to persist linked board");
      res.status(500).json({ error: "Failed to persist linked board" });
    }
  },
);

router.delete(
  "/projects/:projectId/evidence/boards/:boardId",
  async (req: Request, res: Response) => {
    const params = DeleteLinkedBoardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    try {
      const result = await db
        .delete(linkedBoardsTable)
        .where(
          and(
            eq(linkedBoardsTable.id, params.data.boardId),
            eq(linkedBoardsTable.projectId, params.data.projectId),
          ),
        )
        .returning({ id: linkedBoardsTable.id });

      if (result.length === 0) {
        res.status(404).json({ error: "Linked board not found" });
        return;
      }

      res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, "Failed to delete linked board");
      res.status(500).json({ error: "Failed to delete linked board" });
    }
  },
);

export default router;
