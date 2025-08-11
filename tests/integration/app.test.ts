import { vi } from "vitest";

vi.mock("../../src/utils/supabase.client.js", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(() => ({ error: null })),
        upload: vi.fn(() => ({ error: null })),
        download: vi.fn(() => ({ error: null, data: "test data" })),
        remove: vi.fn(() => ({ error: null })),
      })),
    },
  },
}));

vi.mock("../../src/config/index.js", () => ({
  config: {
    env: "development",
    port: 3000,
    database: {
      url: "postgresql://test:test@localhost:5432/test",
    },
    supabase: {
      url: "http://localhost:54321",
      serviceRoleKey: "test-service-key",
    },
    worker: {
      concurrency: 10,
      pollInterval: 500,
    },
    upload: {
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
      cacheControl: "public, max-age=31536000",
      defaultContentType: "application/json",
    },
    metrics: {
      enabled: false,
    },
  },
}));

vi.mock("../../src/services/import.service.js", () => ({
  ImportService: vi.fn().mockImplementation(() => ({
    processImport: vi.fn().mockResolvedValue({ jobId: "test-job-id" }),
  })),
}));

vi.mock("../../src/workers/worker-utils.js", () => ({
  addJob: vi.fn().mockResolvedValue(undefined),
}));

import { describe, it, expect } from "vitest";
import { testClient } from "hono/testing";
import app from "../../src/app.js";
import { createTestContext } from "../utils/test-context.js";
import { validImportRequests, invalidImportRequests } from "../fixtures/import-requests.fixture.js";

global.fetch = vi.fn();

describe("App Integration Tests", () => {
  const client = testClient(app) as any;
  createTestContext();

  describe("Health Route", () => {
    it("should return healthy status when all services are up", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const res = await client.health.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("healthy");
      expect(data.timestamp).toBeDefined();
    });

    it("should return unhealthy status when database is down", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const res = await client.health.$get();

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe("unhealthy");
      expect(data.error).toContain("Database connection failed");
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("Import Route", () => {
    it("should create import job with valid data", async () => {
      const res = await client.import.$post({
        json: validImportRequests.basic,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jobId).toBeDefined();
      expect(typeof data.jobId).toBe("string");
    });

    it("should create import job with resumable upload", async () => {
      const res = await client.import.$post({
        json: validImportRequests.withResumable,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jobId).toBeDefined();
    });

    it("should reject invalid email format", async () => {
      const res = await client.import.$post({
        json: invalidImportRequests.invalidEmail,
      });

      expect(res.status).toBe(400);
    });

    it("should reject empty data array", async () => {
      const res = await client.import.$post({
        json: validImportRequests.emptyData,
      });

      expect(res.status).toBe(400);
    });

    it("should reject empty source", async () => {
      const res = await client.import.$post({
        json: invalidImportRequests.emptySource,
      });

      expect(res.status).toBe(400);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent routes", async () => {
      const res = await client["/non-existent"].$get();

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Not found");
    });
  });
});
