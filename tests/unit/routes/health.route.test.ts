import { vi } from "vitest";

vi.mock("../../../src/utils/supabase.client.js", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(),
      })),
    },
  },
}));

vi.mock("../../../src/config/index.js", () => ({
  config: {
    supabase: {
      url: "http://localhost:54321",
      serviceRoleKey: "test-service-key",
    },
  },
}));

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import healthRouter from "../../../src/routes/health.route.js";
import { supabase } from "../../../src/utils/supabase.client.js";
import { createTestContext } from "../../utils/test-context.js";
import { createSuccessResponse, createErrorResponse } from "../../mocks/http.mock.js";

describe("Health Route", () => {
  let app: Hono;
  let mockSupabase: any;
  let originalFetch: any;

  createTestContext();

  beforeEach(() => {
    app = new Hono();
    app.route("/health", healthRouter);
    mockSupabase = supabase as any;
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("GET /health", () => {
    it("should return healthy status when all services are up", async () => {
      (global.fetch as any).mockResolvedValueOnce(createSuccessResponse());

      mockSupabase.storage.from.mockReturnValue({
        list: vi.fn().mockResolvedValue({ error: null }),
      });

      const res = await app.request("/health");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("healthy");
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    });

    it("should return unhealthy status when database is down", async () => {
      (global.fetch as any).mockResolvedValueOnce(createErrorResponse(500));

      const res = await app.request("/health");

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe("unhealthy");
      expect(data.error).toContain("Database connection failed");
      expect(data.timestamp).toBeDefined();
    });

    it("should return unhealthy status when storage is down", async () => {
      (global.fetch as any).mockResolvedValueOnce(createSuccessResponse());

      mockSupabase.storage.from.mockReturnValue({
        list: vi.fn().mockResolvedValue({ error: new Error("Storage connection failed") }),
      });

      const res = await app.request("/health");

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe("unhealthy");
      expect(data.error).toContain("Storage connection failed");
      expect(data.timestamp).toBeDefined();
    });

    it("should return unhealthy status when database request throws", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const res = await app.request("/health");

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe("unhealthy");
      expect(data.error).toContain("Network error");
      expect(data.timestamp).toBeDefined();
    });

    it("should return unhealthy status when storage request throws", async () => {
      (global.fetch as any).mockResolvedValueOnce(createSuccessResponse());

      mockSupabase.storage.from.mockReturnValue({
        list: vi.fn().mockRejectedValue(new Error("Storage error")),
      });

      const res = await app.request("/health");

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe("unhealthy");
      expect(data.error).toContain("Storage error");
      expect(data.timestamp).toBeDefined();
    });

    it("should make correct database health check request", async () => {
      (global.fetch as any).mockResolvedValueOnce(createSuccessResponse());

      mockSupabase.storage.from.mockReturnValue({
        list: vi.fn().mockResolvedValue({ error: null }),
      });

      await app.request("/health");

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:54321/rest/v1/",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-service-key",
            apikey: "test-service-key",
          },
        })
      );
    });

    it("should make correct storage health check request", async () => {
      (global.fetch as any).mockResolvedValueOnce(createSuccessResponse());

      const mockList = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.from.mockReturnValue({
        list: mockList,
      });

      await app.request("/health");

      expect(mockSupabase.storage.from).toHaveBeenCalledWith("imports");
      expect(mockList).toHaveBeenCalledWith("", { limit: 1 });
    });

    it("should handle database timeout", async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 100))
      );

      const res = await app.request("/health");

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe("unhealthy");
      expect(data.error).toContain("Request timeout");
    });
  });
});
