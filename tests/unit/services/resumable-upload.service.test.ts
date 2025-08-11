import { vi } from "vitest";

vi.mock("tus-js-client", () => ({
  Upload: vi.fn(function MockUpload(file: any, options: any) {
    setTimeout(() => {
      if (options.onSuccess) {
        options.onSuccess();
      }
    }, 10);

    return {
      url: "https://example.com/uploaded-file",
      findPreviousUploads: vi.fn().mockResolvedValue([]),
      resumeFromPreviousUpload: vi.fn(),
      start: vi.fn(),
      onError: vi.fn(),
      onProgress: vi.fn(),
      onSuccess: vi.fn(),
    };
  }),
}));

vi.mock("../../../src/config/index.js", () => ({
  config: {
    env: "development",
    supabase: {
      url: "http://localhost:54321",
      serviceRoleKey: "test-service-key",
    },
    upload: {
      cacheControl: "public, max-age=31536000",
      defaultContentType: "application/json",
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 6 * 1024 * 1024,
    },
  },
}));

vi.mock("../../../src/constants/storage.constants.js", () => ({
  CONTENT_TYPES: {
    JSON: "application/json",
  },
  STORAGE_BUCKETS: {
    IMPORTS: "imports",
  },
}));

import { describe, it, expect, beforeEach } from "vitest";
import { ResumableUploadService } from "../../../src/services/resumable-upload.service.js";
import { createMockContacts, sampleContacts } from "../../fixtures/contacts.fixture.js";
import { createTestContext } from "../../utils/test-context.js";

describe("ResumableUploadService", () => {
  let resumableUploadService: ResumableUploadService;

  createTestContext();

  beforeEach(() => {
    resumableUploadService = new ResumableUploadService();
  });

  describe("uploadFile", () => {
    it("should upload file successfully", async () => {
      const options = {
        bucketName: "imports",
        fileName: "test.json",
        file: Buffer.from("test data"),
        contentType: "application/json",
      };

      const result = await resumableUploadService.uploadFile(options);

      expect(result).toBe("https://example.com/uploaded-file");
    });

    it("should handle upload with progress callback", async () => {
      const progressCallback = vi.fn();
      const options = {
        bucketName: "imports",
        fileName: "test.json",
        file: Buffer.from("test data"),
        onProgress: progressCallback,
      };

      const result = await resumableUploadService.uploadFile(options);

      expect(result).toBe("https://example.com/uploaded-file");
    });

    it("should use default content type when not provided", async () => {
      const options = {
        bucketName: "imports",
        fileName: "test.json",
        file: Buffer.from("test data"),
      };

      const result = await resumableUploadService.uploadFile(options);

      expect(result).toBe("https://example.com/uploaded-file");
    });
  });

  describe("uploadJsonData", () => {
    it("should upload JSON data successfully", async () => {
      const mockData = sampleContacts;
      const mockMetadata = {
        jobId: "test-job-id",
        source: "test-source",
      };

      const result = await resumableUploadService.uploadJsonData("test-file.json", mockData, mockMetadata);

      expect(result).toBe("https://example.com/uploaded-file");
    });

    it("should handle upload without metadata", async () => {
      const mockData = createMockContacts(1);

      const result = await resumableUploadService.uploadJsonData("test-file.json", mockData);

      expect(result).toBe("https://example.com/uploaded-file");
    });

    it("should handle empty data array", async () => {
      const mockMetadata = {
        jobId: "test-job-id",
        source: "test-source",
      };

      const result = await resumableUploadService.uploadJsonData("test-file.json", [], mockMetadata);

      expect(result).toBe("https://example.com/uploaded-file");
    });
  });
});
