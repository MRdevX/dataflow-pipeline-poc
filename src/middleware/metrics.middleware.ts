import { prometheus } from "@hono/prometheus";
import type { Hono } from "hono";
import { config } from "../config/index.js";
import { metrics } from "../utils/metrics.js";

export function setupMetrics(app: Hono) {
  if (!config.metrics.enabled) return;

  const { printMetrics, registerMetrics } = prometheus();

  app.use("*", registerMetrics);

  app.use("*", async (c, next) => {
    const startTime = Date.now();
    const method = c.req.method;
    const contentType = c.req.header("Content-Type") || "unknown";
    const source = c.req.header("X-Source") || "unknown";

    try {
      await next();
      const duration = (Date.now() - startTime) / 1000;

      metrics.recordRequest(method, contentType, source, c.res.status, duration);
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      metrics.recordRequest(method, contentType, source, 500, duration);
      throw error;
    }
  });

  app.get("/metrics", printMetrics);
}
