import { vi } from "vitest";

vi.mock("@hono/prometheus", () => ({
  prometheus: vi.fn(() => ({
    printMetrics: vi.fn(),
    registerMetrics: vi.fn(),
  })),
}));

vi.mock("../../../src/config/index.js", () => ({
  config: {
    metrics: {
      enabled: true,
    },
  },
}));

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { setupMetrics } from "../../../src/middleware/metrics.middleware.js";
import { prometheus } from "@hono/prometheus";
import { createTestContext } from "../../utils/test-context.js";

describe("Metrics Middleware", () => {
  let app: Hono;
  let mockPrometheus: any;

  createTestContext();

  beforeEach(() => {
    app = new Hono();
    mockPrometheus = prometheus as any;

    app.use = vi.fn();
    app.get = vi.fn();

    vi.clearAllMocks();
  });

  describe("setupMetrics", () => {
    it("should setup metrics when enabled", () => {
      const mockPrintMetrics = vi.fn();
      const mockRegisterMetrics = vi.fn();

      mockPrometheus.mockReturnValue({
        printMetrics: mockPrintMetrics,
        registerMetrics: mockRegisterMetrics,
      });

      setupMetrics(app);

      expect(mockPrometheus).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("*", mockRegisterMetrics);
      expect(app.get).toHaveBeenCalledWith("/metrics", mockPrintMetrics);
    });

    it("should handle prometheus initialization failure gracefully", () => {
      mockPrometheus.mockImplementation(() => {
        throw new Error("Prometheus initialization failed");
      });

      expect(() => setupMetrics(app)).toThrow("Prometheus initialization failed");
    });

    it("should add metrics routes when metrics are enabled", () => {
      const mockPrintMetrics = vi.fn();
      const mockRegisterMetrics = vi.fn();

      mockPrometheus.mockReturnValue({
        printMetrics: mockPrintMetrics,
        registerMetrics: mockRegisterMetrics,
      });

      app.get("/health", (c) => c.text("OK"));
      app.post("/import", (c) => c.json({ success: true }));

      setupMetrics(app);

      expect(mockPrometheus).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("*", mockRegisterMetrics);
      expect(app.get).toHaveBeenCalledWith("/metrics", mockPrintMetrics);
    });
  });
});
