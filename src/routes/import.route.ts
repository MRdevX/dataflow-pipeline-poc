import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { importRequestSchema } from "../validation/validation.schemas.js";
import { ImportService } from "../services/import.service.js";

const router = new Hono();
const importService = new ImportService();

router.post("/", zValidator("json", importRequestSchema), async (c) => {
  const validatedData = c.req.valid("json");

  const request = {
    source: validatedData.source,
    data: validatedData.data,
  };

  const response = await importService.processImport(request);

  console.log(`Import job created: ${response.jobId}`);
  return c.json(response, 200);
});

export default router;
