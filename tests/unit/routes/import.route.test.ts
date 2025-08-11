import { vi } from "vitest";

vi.mock("../../../src/services/import.service.js", () => ({
  ImportService: vi.fn().mockImplementation(() => ({
    processImport: vi.fn().mockResolvedValue({ jobId: "test-job-id" }),
  })),
}));

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import importRouter from "../../../src/routes/import.route.js";
import { validImportRequests, invalidImportRequests } from "../../fixtures/import-requests.fixture.js";
import { createTestContext } from "../../utils/test-context.js";

describe("Import Route", () => {
  let app: Hono;

  createTestContext();

  beforeEach(() => {
    app = new Hono();
    app.route("/import", importRouter);
    vi.clearAllMocks();
  });

  describe("POST /import", () => {
    it("should create import job with valid data", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validImportRequests.basic),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("jobId");
    });

    it("should create import job with resumable upload", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validImportRequests.withResumable),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("jobId");
    });

    it("should reject invalid email format", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidImportRequests.invalidEmail),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject empty source", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidImportRequests.emptySource),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject missing required fields", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidImportRequests.missingName),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject empty data array", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validImportRequests.emptyData),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject source longer than 100 characters", async () => {
      const invalidRequest = {
        source: "a".repeat(101),
        data: [{ name: "John Doe", email: "john@example.com" }],
        useResumable: false,
      };

      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("should handle malformed JSON", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      });

      expect(res.status).toBe(400);
    });

    it("should handle missing JSON body", async () => {
      const res = await app.request("/import", {
        method: "POST",
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

      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestWithoutResumable),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("jobId");
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

      const res = await app.request("/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(largeRequest),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("jobId");
    });
  });
});
