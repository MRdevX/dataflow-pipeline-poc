import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ImportService } from "../services/import.service.js";
import { importRequestSchema } from "../validation/validation.schemas.js";

const router = new Hono();
const importService = new ImportService();

router.post("/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  const source = formData.get("source") as string;
  const useResumable = formData.get("useResumable") === "true";

  const response = await importService.processFileUpload(file, source, useResumable);
  return c.json(response, 200);
});

router.post("/stream", async (c) => {
  const source = c.req.header("X-Source");
  const useResumable = c.req.header("X-Use-Resumable") === "true";
  const body = c.req.raw.body;

  if (!source) {
    return c.json({ error: "Missing X-Source header" }, 400);
  }

  if (!body) {
    return c.json({ error: "No request body" }, 400);
  }

  const response = await importService.processStreamUpload(body, source, useResumable);
  return c.json(response, 200);
});

router.post("/", zValidator("json", importRequestSchema), async (c) => {
  const validatedData = c.req.valid("json");
  const response = await importService.processImport(validatedData, validatedData.useResumable);
  return c.json(response, 200);
});

export default router;
