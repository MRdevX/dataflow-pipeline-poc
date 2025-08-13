import { Hono } from "hono";
import { detectContentType, createHandler } from "../utils/import.utils.js";

const router = new Hono();

router.post("/", async (c) => {
  const contentTypeHeader = c.req.header("Content-Type") || "";
  const contentType = detectContentType(contentTypeHeader);
  const handler = createHandler(contentType);

  try {
    const result = await handler(c);

    if ("error" in result) {
      return c.json(
        {
          error: result.error,
          ...(result.issues && { issues: result.issues }),
        },
        result.status
      );
    }

    return c.json(result.response, result.status);
  } catch (error) {
    console.error("Import error:", error);
    return c.json({ error: "Import failed" }, 500);
  }
});

export default router;
