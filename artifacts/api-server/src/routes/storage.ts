import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { and, eq } from "drizzle-orm";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { db, evidenceFilesTable } from "@workspace/db";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  isUploadObjectPath,
} from "../lib/objectStorage";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Issue a short-lived presigned PUT URL the client can upload directly to.
 * The client sends file metadata (name, size, contentType) — never the file
 * itself. Auth-gated so anonymous clients can't burn presigned URLs.
 */
router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

/**
 * GET /storage/objects/uploads/:uuid
 *
 * Serve an evidence object. Access is gated by the evidence_files table: the
 * object is only served if it's been registered as evidence AND the calling
 * user owns the file.
 */
router.get(
  "/storage/objects/*path",
  requireAuth,
  async (req: Request, res: Response) => {
    const organisationId = (req as AuthedRequest).organisationId;
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    if (!isUploadObjectPath(objectPath)) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    try {
      const [registered] = await db
        .select({ id: evidenceFilesTable.id })
        .from(evidenceFilesTable)
        .where(
          and(
            eq(evidenceFilesTable.objectPath, objectPath),
            eq(evidenceFilesTable.organisationId, organisationId),
          ),
        )
        .limit(1);

      if (!registered) {
        res.status(404).json({ error: "Object not found" });
        return;
      }

      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      const response = await objectStorageService.downloadObject(objectFile);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        req.log.warn({ err: error }, "Object not found");
        res.status(404).json({ error: "Object not found" });
        return;
      }
      req.log.error({ err: error }, "Error serving object");
      res.status(500).json({ error: "Failed to serve object" });
    }
  },
);

export default router;
