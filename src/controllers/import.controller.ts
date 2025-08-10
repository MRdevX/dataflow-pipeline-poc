import type { Context } from "hono";
import type { ImportRequest } from "../models/job.model.js";
import { ImportService } from "../services/import.service.js";

const importService = new ImportService();

export class ImportController {
  async handleImport(c: Context) {
    const body = await c.req.json();
    const request: ImportRequest = body;
    const response = await importService.processImport(request);

    console.log(`Import job created: ${response.jobId}`);
    return c.json(response, 200);
  }
}
