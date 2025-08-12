import type { ContentType, InputHandler, HandlerResult } from "../types/import.types.js";
import { ImportService } from "../services/import.service.js";
import { importRequestSchema } from "../validation/validation.schemas.js";

const importService = new ImportService();

export function detectContentType(contentType: string): ContentType {
  const ct = (contentType || "").toLowerCase();
  if (!ct) return "stream";
  if (ct.includes("multipart/form-data")) return "multipart";
  if (ct.includes("application/json")) return "json";
  return "stream";
}

async function extractFormData(c: any) {
  const formData = await c.req.formData();
  return {
    file: formData.get("file") as File,
    source: formData.get("source") as string,
    useResumable: formData.get("useResumable") === "true",
  };
}

function extractStreamHeaders(c: any) {
  return {
    source: c.req.header("X-Source"),
    useResumable: c.req.header("X-Use-Resumable") === "true",
    body: c.req.raw.body,
  };
}

function validateRequiredFields(fields: Record<string, any>, required: string[]): string | null {
  for (const field of required) {
    if (!fields[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

export function createHandler(contentType: ContentType): InputHandler {
  switch (contentType) {
    case "multipart":
      return async (c: any): Promise<HandlerResult> => {
        const { file, source, useResumable } = await extractFormData(c);

        const error = validateRequiredFields({ file, source }, ["file", "source"]);
        if (error) {
          return { error, status: 400 };
        }

        const response = await importService.processFileUpload(file, source, useResumable);
        return { response, status: 200 };
      };

    case "json":
      return async (c: any): Promise<HandlerResult> => {
        const body = await c.req.json();

        const validationResult = importRequestSchema.safeParse(body);
        if (!validationResult.success) {
          return {
            error: "Invalid JSON format",
            issues: validationResult.error.issues,
            status: 400,
          };
        }

        const response = await importService.processImport(validationResult.data, validationResult.data.useResumable);
        return { response, status: 200 };
      };

    case "stream":
      return async (c: any): Promise<HandlerResult> => {
        const { source, useResumable, body } = extractStreamHeaders(c);

        const error = validateRequiredFields({ source, body }, ["source", "body"]);
        if (error) {
          return { error: `Missing required parameters for stream upload: ${error}`, status: 400 };
        }

        const response = await importService.processStreamUpload(body, source, useResumable);
        return { response, status: 200 };
      };

    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}
