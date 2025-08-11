import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { poweredBy } from "hono/powered-by";
import importRoutes from "./routes/import.route.js";
import healthRoutes from "./routes/health.route.js";
import { setupMetrics } from "./middleware/metrics.middleware.js";

const app = new Hono();

app.use(poweredBy());
app.use(logger());
app.use(cors());

setupMetrics(app);

app.route("/health", healthRoutes);
app.route("/import", importRoutes);

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

export default app;
