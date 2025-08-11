import { prometheus } from "@hono/prometheus";
import type { Hono } from "hono";
import { config } from "../config/index.js";

export function setupMetrics(app: Hono) {
  if (!config.metrics.enabled) {
    return;
  }

  const { printMetrics, registerMetrics } = prometheus();

  app.use("*", registerMetrics);

  app.get("/metrics", printMetrics);
}
