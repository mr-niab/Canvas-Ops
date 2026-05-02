import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { eq } from "drizzle-orm";
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

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Issue a short-lived presigned PUT URL the client can upload directly to.
 * The client sends file metadata (name, size, contentType) — never the file
 * itself. The returned `objectPath` is a normalized `/objects/uploads/<uuid>`
 * path that the client must echo back to the evidence-create endpoint to
 * register the file.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
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
});

/**
 * GET /storage/objects/uploads/:uuid
 *
 * Serve a previously uploaded evidence object. Access is gated by the
 * evidence_files table: a path is only served if it has been registered as
 * an evidence file. This keeps object visibility in lockstep with the
 * evidence API — orphaned uploads (presigned but never registered) and
 * deleted files are not retrievable.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
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
      .where(eq(evidenceFilesTable.objectPath, objectPath))
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
});

export default router;
