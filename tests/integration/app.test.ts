import { describe, it, expect, vi } from "vitest";
import { testClient } from "hono/testing";
import app from "../../src/app.js";
import { createTestContext } from "../utils/test-helpers.js";

vi.mock("../../src/utils/supabase.client.js", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(() => ({ error: null })),
      })),
    },
  },
}));

vi.mock("../../src/config/index.js", () => ({
  config: {
    supabase: {
      url: "http://localhost:54321",
      serviceRoleKey: "test-key",
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
    const createValidImportData = (overrides = {}) => ({
      source: "test-source",
      data: [
        {
          name: "John Doe",
          email: "john@example.com",
        },
      ],
      useResumable: false,
      ...overrides,
    });

    it("should create import job with valid data", async () => {
      const validImportData = createValidImportData();

      const res = await client.import.$post({
        json: validImportData,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jobId).toBeDefined();
      expect(typeof data.jobId).toBe("string");
    });

    it("should create import job with resumable upload", async () => {
      const validImportData = createValidImportData({
        data: [{ name: "Jane Doe", email: "jane@example.com" }],
        useResumable: true,
      });

      const res = await client.import.$post({
        json: validImportData,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jobId).toBeDefined();
    });

    it("should reject invalid email format", async () => {
      const invalidImportData = createValidImportData({
        data: [{ name: "John Doe", email: "invalid-email" }],
      });

      const res = await client.import.$post({
        json: invalidImportData,
      });

      expect(res.status).toBe(400);
    });

    it("should reject empty data array", async () => {
      const invalidImportData = createValidImportData({
        data: [],
      });

      const res = await client.import.$post({
        json: invalidImportData,
      });

      expect(res.status).toBe(400);
    });

    it("should reject empty source", async () => {
      const invalidImportData = createValidImportData({
        source: "",
      });

      const res = await client.import.$post({
        json: invalidImportData,
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
