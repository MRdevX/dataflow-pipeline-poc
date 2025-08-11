import { Hono } from "hono";
import { supabase } from "../utils/supabase.client.js";
import { config } from "../config/index.js";

const healthRouter = new Hono();

healthRouter.get("/", async (c) => {
  try {
    const response = await fetch(`${config.supabase.url}/rest/v1/`, {
      headers: {
        Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
        apikey: config.supabase.serviceRoleKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Database connection failed: ${response.status}`);
    }

    const { error: storageError } = await supabase.storage.from("imports").list("", { limit: 1 });
    if (storageError) throw storageError;

    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

export default healthRouter;
