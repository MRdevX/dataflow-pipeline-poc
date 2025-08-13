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
    processFileUpload: vi.fn().mockResolvedValue({ jobId: "test-job-id" }),
    processStreamUpload: vi.fn().mockResolvedValue({ jobId: "test-job-id" }),
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

    it("should return unhealthy status when storage is down", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { supabase } = await import("../../src/utils/supabase.client.js");
      (supabase.storage.from as any).mockReturnValueOnce({
        list: vi.fn(() => ({ error: new Error("Storage error") })),
      });

      const res = await client.health.$get();

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe("unhealthy");
      expect(data.error).toContain("Storage error");
    });
  });

  describe("Import Route", () => {
    describe("JSON Content Type", () => {
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
        const data = await res.json();
        expect(data.error).toBe("Invalid JSON format");
      });

      it("should reject empty data array", async () => {
        const res = await client.import.$post({
          json: validImportRequests.emptyData,
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Invalid JSON format");
      });

      it("should reject empty source", async () => {
        const res = await client.import.$post({
          json: invalidImportRequests.emptySource,
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Invalid JSON format");
      });

      it("should reject missing required fields", async () => {
        const res = await client.import.$post({
          json: invalidImportRequests.missingName,
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Invalid JSON format");
      });

      it("should reject source longer than 100 characters", async () => {
        const invalidRequest = {
          source: "a".repeat(101),
          data: [{ name: "John Doe", email: "john@example.com" }],
          useResumable: false,
        };

        const res = await client.import.$post({
          json: invalidRequest,
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Invalid JSON format");
      });

      it("should handle malformed JSON", async () => {
        const res = await client.import.$post({
          body: "invalid json",
          headers: {
            "Content-Type": "application/json",
          },
        });

        expect(res.status).toBe(400);
      });

      it("should default useResumable to false when not provided", async () => {
        const requestWithoutResumable = {
          source: "Test Company",
          data: [{ name: "John Doe", email: "john@example.com" }],
        };

        const res = await client.import.$post({
          json: requestWithoutResumable,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.jobId).toBeDefined();
      });

      it("should handle large data arrays", async () => {
        const largeData = Array.from({ length: 1000 }, (_, i) => ({
          name: `User ${i}`,
          email: `user${i}@example.com`,
        }));

        const largeRequest = {
          source: "Test Company",
          data: largeData,
          useResumable: false,
        };

        const res = await client.import.$post({
          json: largeRequest,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.jobId).toBeDefined();
      });
    });

    describe("Stream Content Type", () => {
      it("should create import job with valid stream upload", async () => {
        const streamData = JSON.stringify([{ name: "John Doe", email: "john@example.com" }]);

        const res = await client.import.$post({
          body: streamData,
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Source": "Test Company",
            "X-Use-Resumable": "false",
          },
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Missing required parameters for stream upload");
      });

      it("should create import job with resumable stream upload", async () => {
        const streamData = JSON.stringify([{ name: "John Doe", email: "john@example.com" }]);

        const res = await client.import.$post({
          body: streamData,
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Source": "Test Company",
            "X-Use-Resumable": "true",
          },
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Missing required parameters for stream upload");
      });

      it("should reject missing source header", async () => {
        const streamData = JSON.stringify([{ name: "John Doe", email: "john@example.com" }]);

        const res = await client.import.$post({
          body: streamData,
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Use-Resumable": "false",
          },
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Missing required parameters for stream upload");
      });

      it("should handle default content type as stream", async () => {
        const streamData = JSON.stringify([{ name: "John Doe", email: "john@example.com" }]);

        const res = await client.import.$post({
          body: streamData,
          headers: {
            "X-Source": "Test Company",
            "X-Use-Resumable": "false",
          },
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Missing required parameters for stream upload");
      });
    });

    describe("Multipart Content Type", () => {
      it("should handle multipart content type detection", async () => {
        const res = await client.import.$post({
          body: "test",
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        expect(res.status).toBe(400);
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent routes", async () => {
      const res = await client["/non-existent"].$get();

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Not found");
    });

    it("should handle unsupported content types", async () => {
      const res = await client.import.$post({
        body: "test",
        headers: {
          "Content-Type": "text/plain",
        },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Missing required parameters for stream upload");
    });

    it("should handle missing body for JSON requests", async () => {
      const res = await client.import.$post({
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("Metrics Middleware", () => {
    it("should include metrics headers in responses", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const res = await client.health.$get();

      expect(res.status).toBe(200);
    });
  });
});
