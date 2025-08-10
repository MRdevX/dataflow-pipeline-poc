import { serve } from "@hono/node-server";
import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";

// import { quickAddJob } from "graphile-worker";
import { ImportRequest, ImportResponse } from "./types";

const app = new Hono();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const connectionString = process.env.DATABASE_URL!;

app.post("/import", async (c) => {
  const body: ImportRequest = (await c.req.json()) as ImportRequest;
  const { source, data } = body;

  const jobId = Date.now();

  const fileName = `import-${jobId}.json`;
  await supabase.storage.from("imports").upload(fileName, JSON.stringify(data), {
    contentType: "application/json",
  });

  // TODO: Graphile Worker

  const response: ImportResponse = { jobId };
  return c.json(response, 200);
});

app.get("/health", async (c) => {
  return c.text("OK", 200);
});

const port = parseInt(process.env.PORT || "3000");

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
