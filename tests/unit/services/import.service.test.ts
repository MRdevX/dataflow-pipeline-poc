import { describe, it, expect, beforeEach, vi } from "vitest";
import { ImportService } from "../../../src/services/import.service.js";
import type { ImportRequest } from "../../../src/models/job.model.js";
import { createTestContext } from "../../utils/test-helpers.js";

vi.mock("../../../src/repositories/storage.repository.js");
vi.mock("../../../src/services/resumable-upload.service.js");
vi.mock("../../../src/workers/worker-utils.js");

describe("ImportService", () => {
  let importService: ImportService;
  const { createMockImportRequest } = createTestContext();

  beforeEach(() => {
    importService = new ImportService();
  });

  describe("processImport", () => {
    it("should process import with non-resumable upload", async () => {
      const request = createMockImportRequest();
      const result = await importService.processImport(request, false);

      expect(result).toHaveProperty("jobId");
      expect(typeof result.jobId).toBe("string");
    });

    it("should process import with resumable upload", async () => {
      const request = createMockImportRequest();
      const result = await importService.processImport(request, true);

      expect(result).toHaveProperty("jobId");
      expect(typeof result.jobId).toBe("string");
    });

    it("should default to non-resumable upload when useResumable is not specified", async () => {
      const request = createMockImportRequest();
      const result = await importService.processImport(request);

      expect(result).toHaveProperty("jobId");
    });

    it("should generate unique job IDs for different requests", async () => {
      const request = createMockImportRequest();
      const result1 = await importService.processImport(request, false);

      await new Promise((resolve) => setTimeout(resolve, 10));
      const result2 = await importService.processImport(request, false);

      expect(result1.jobId).not.toBe(result2.jobId);
    });

    it("should handle empty data array", async () => {
      const requestWithEmptyData: ImportRequest = {
        source: "test-source",
        data: [],
      };

      const result = await importService.processImport(requestWithEmptyData, false);

      expect(result).toHaveProperty("jobId");
    });
  });
});
