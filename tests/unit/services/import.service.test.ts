import { vi } from "vitest";

vi.mock("../../../src/repositories/storage.repository.js", () => ({
  StorageRepository: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn().mockResolvedValue(undefined),
    downloadFile: vi.fn().mockResolvedValue(""),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../../src/services/resumable-upload.service.js", () => ({
  ResumableUploadService: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn().mockResolvedValue("https://example.com/uploaded-file"),
    uploadJsonData: vi.fn().mockResolvedValue("https://example.com/uploaded-file"),
  })),
}));

vi.mock("../../../src/workers/worker-utils.js", () => ({
  addJob: vi.fn().mockResolvedValue(undefined),
}));

import { describe, it, expect, beforeEach } from "vitest";
import { ImportService } from "../../../src/services/import.service.js";
import {
  createMockImportRequest,
  validImportRequests,
} from "../../fixtures/import-requests.fixture.js";
import { createTestContext } from "../../utils/test-context.js";
import { expectValidJobId } from "../../utils/assertions.js";

describe("ImportService", () => {
  let importService: ImportService;

  createTestContext();

  beforeEach(() => {
    importService = new ImportService();
  });

  describe("processImport", () => {
    it("should process import with non-resumable upload", async () => {
      const request = createMockImportRequest();
      const result = await importService.processImport(request, false);

      expectValidJobId(result);
    });

    it("should process import with resumable upload", async () => {
      const request = createMockImportRequest();
      const result = await importService.processImport(request, true);

      expectValidJobId(result);
    });

    it("should default to non-resumable upload when useResumable is not specified", async () => {
      const request = createMockImportRequest();
      const result = await importService.processImport(request);

      expectValidJobId(result);
    });

    it("should generate unique job IDs for different requests", async () => {
      const request = createMockImportRequest();
      const result1 = await importService.processImport(request, false);

      await new Promise((resolve) => setTimeout(resolve, 10));
      const result2 = await importService.processImport(request, false);

      expect(result1.jobId).not.toBe(result2.jobId);
    });

    it("should handle empty data array", async () => {
      const result = await importService.processImport(validImportRequests.emptyData, false);

      expectValidJobId(result);
    });
  });
});
