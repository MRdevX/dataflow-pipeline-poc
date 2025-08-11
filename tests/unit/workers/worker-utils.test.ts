import { vi } from "vitest";

vi.mock("graphile-worker", () => ({
  makeWorkerUtils: vi.fn(),
}));

import { describe, it, expect, beforeEach } from "vitest";
import { createWorkerUtils, addJob } from "../../../src/workers/worker-utils.js";
import { makeWorkerUtils } from "graphile-worker";
import { createTestContext } from "../../utils/test-context.js";
import { createAsyncMock, createRejectedMock } from "../../utils/test-helpers.js";

describe("Worker Utils", () => {
  let mockWorkerUtils: any;

  createTestContext();

  beforeEach(() => {
    vi.clearAllMocks();

    mockWorkerUtils = {
      addJob: vi.fn().mockResolvedValue({ id: "test-job-id" }),
      release: vi.fn().mockResolvedValue(undefined),
    };

    (makeWorkerUtils as any).mockResolvedValue(mockWorkerUtils);
  });

  describe("createWorkerUtils", () => {
    it("should create worker utils successfully", async () => {
      const result = await createWorkerUtils();

      expect(makeWorkerUtils).toHaveBeenCalledWith({
        connectionString: expect.any(String),
      });
      expect(result).toBe(mockWorkerUtils);
    });

    it("should handle worker utils creation failure", async () => {
      const creationError = new Error("Failed to create worker utils");
      (makeWorkerUtils as any).mockRejectedValue(creationError);

      await expect(createWorkerUtils()).rejects.toThrow("Failed to create worker utils");
    });
  });

  describe("addJob", () => {
    it("should add job successfully", async () => {
      const taskName = "processImportJob";
      const payload = { jobId: "test-123", source: "test-source" };

      const result = await addJob(taskName, payload);

      expect(makeWorkerUtils).toHaveBeenCalledWith({
        connectionString: expect.any(String),
      });
      expect(mockWorkerUtils.addJob).toHaveBeenCalledWith(taskName, payload);
      expect(mockWorkerUtils.release).toHaveBeenCalled();
      expect(result).toEqual({ id: "test-job-id" });
    });

    it("should add job with complex payload", async () => {
      const taskName = "processImportJob";
      const payload = {
        jobId: "test-123",
        source: "test-source",
        data: { contacts: [{ name: "John", email: "john@example.com" }] },
        metadata: { priority: "high", retryCount: 0 },
      };

      await addJob(taskName, payload);

      expect(mockWorkerUtils.addJob).toHaveBeenCalledWith(taskName, payload);
      expect(mockWorkerUtils.release).toHaveBeenCalled();
    });

    it("should release worker utils even when addJob fails", async () => {
      const taskName = "processImportJob";
      const payload = { jobId: "test-123" };
      const addJobError = new Error("Failed to add job");

      mockWorkerUtils.addJob.mockRejectedValue(addJobError);

      await expect(addJob(taskName, payload)).rejects.toThrow("Failed to add job");

      expect(mockWorkerUtils.addJob).toHaveBeenCalledWith(taskName, payload);
      expect(mockWorkerUtils.release).toHaveBeenCalled();
    });

    it("should handle worker utils creation failure in addJob", async () => {
      const taskName = "processImportJob";
      const payload = { jobId: "test-123" };
      const creationError = new Error("Failed to create worker utils");

      (makeWorkerUtils as any).mockRejectedValue(creationError);

      await expect(addJob(taskName, payload)).rejects.toThrow("Failed to create worker utils");

      expect(makeWorkerUtils).toHaveBeenCalledWith({
        connectionString: expect.any(String),
      });
      expect(mockWorkerUtils.addJob).not.toHaveBeenCalled();
      expect(mockWorkerUtils.release).not.toHaveBeenCalled();
    });

    it("should handle multiple concurrent job additions", async () => {
      const taskName = "processImportJob";
      const payload1 = { jobId: "test-1" };
      const payload2 = { jobId: "test-2" };

      const mockWorkerUtils1 = {
        addJob: vi.fn().mockResolvedValue({ id: "job-1" }),
        release: vi.fn().mockResolvedValue(undefined),
      };
      const mockWorkerUtils2 = {
        addJob: vi.fn().mockResolvedValue({ id: "job-2" }),
        release: vi.fn().mockResolvedValue(undefined),
      };

      (makeWorkerUtils as any).mockResolvedValueOnce(mockWorkerUtils1).mockResolvedValueOnce(mockWorkerUtils2);

      const [result1, result2] = await Promise.all([addJob(taskName, payload1), addJob(taskName, payload2)]);

      expect(result1).toEqual({ id: "job-1" });
      expect(result2).toEqual({ id: "job-2" });
      expect(mockWorkerUtils1.addJob).toHaveBeenCalledWith(taskName, payload1);
      expect(mockWorkerUtils2.addJob).toHaveBeenCalledWith(taskName, payload2);
      expect(mockWorkerUtils1.release).toHaveBeenCalled();
      expect(mockWorkerUtils2.release).toHaveBeenCalled();
    });
  });
});
