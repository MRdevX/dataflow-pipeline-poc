import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ResumableUploadService } from "../../../src/services/resumable-upload.service.js";
import * as tus from "tus-js-client";
import { createTestContext } from "../../utils/test-context.js";

vi.mock("tus-js-client", () => ({
  Upload: vi.fn(),
}));

vi.mock("../../../src/config/index.js", () => ({
  config: {
    env: "test",
    supabase: {
      url: "https://test.supabase.co",
      serviceRoleKey: "test-key",
    },
    upload: {
      defaultContentType: "application/json",
      retryDelays: [0, 1000, 3000, 5000],
      cacheControl: "3600",
      chunkSize: 6 * 1024 * 1024,
    },
  },
}));

describe("ResumableUploadService", () => {
  let service: ResumableUploadService;
  let mockUpload: any;

  createTestContext();

  beforeEach(() => {
    service = new ResumableUploadService();
    mockUpload = {
      url: "https://test.supabase.co/storage/v1/object/public/imports/test-file.json",
      findPreviousUploads: vi.fn().mockResolvedValue([]),
      resumeFromPreviousUpload: vi.fn(),
      start: vi.fn(),
    };
    (tus.Upload as any).mockImplementation(() => mockUpload);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadFile", () => {
    it("should upload file successfully", async () => {
      const file = Buffer.from("test content");
      const options = {
        bucketName: "imports",
        fileName: "test-file.json",
        file,
        contentType: "application/json",
        metadata: { jobId: "test-job", source: "test-source" },
      };

      mockUpload.start.mockImplementation(() => {
        const onSuccess = (tus.Upload as any).mock.calls[0][1].onSuccess;
        onSuccess();
      });

      const result = await service.uploadFile(options);

      expect(tus.Upload).toHaveBeenCalledWith(file, {
        endpoint: expect.any(String),
        retryDelays: [0, 1000, 3000, 5000],
        headers: {
          authorization: "Bearer test-key",
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: "imports",
          objectName: "test-file.json",
          contentType: "application/json",
          cacheControl: "3600",
          metadata: JSON.stringify({ jobId: "test-job", source: "test-source" }),
        },
        chunkSize: 6 * 1024 * 1024,
        onError: expect.any(Function),
        onProgress: expect.any(Function),
        onSuccess: expect.any(Function),
      });

      expect(mockUpload.start).toHaveBeenCalled();
      expect(result).toBe(mockUpload.url);
    });

    it("should handle upload errors", async () => {
      const file = Buffer.from("test content");
      const options = {
        bucketName: "imports",
        fileName: "test-file.json",
        file,
        contentType: "application/json",
        metadata: {},
      };

      const uploadError = new Error("Upload failed");
      mockUpload.start.mockImplementation(() => {
        const onError = (tus.Upload as any).mock.calls[0][1].onError;
        onError(uploadError);
      });

      await expect(service.uploadFile(options)).rejects.toThrow("Upload failed");
    });

    it("should call onProgress callback when provided", async () => {
      const file = Buffer.from("test content");
      const onProgress = vi.fn();
      const options = {
        bucketName: "imports",
        fileName: "test-file.json",
        file,
        contentType: "application/json",
        metadata: {},
        onProgress,
      };

      mockUpload.start.mockImplementation(() => {
        const onProgressCallback = (tus.Upload as any).mock.calls[0][1].onProgress;
        onProgressCallback(100, 200);
        const onSuccess = (tus.Upload as any).mock.calls[0][1].onSuccess;
        onSuccess();
      });

      await service.uploadFile(options);

      expect(onProgress).toHaveBeenCalledWith(100, 200);
    });

    it("should resume from previous upload if available", async () => {
      const file = Buffer.from("test content");
      const previousUpload = { url: "previous-upload-url" };
      mockUpload.findPreviousUploads.mockResolvedValue([previousUpload]);

      const options = {
        bucketName: "imports",
        fileName: "test-file.json",
        file,
        contentType: "application/json",
        metadata: {},
      };

      mockUpload.start.mockImplementation(() => {
        const onSuccess = (tus.Upload as any).mock.calls[0][1].onSuccess;
        onSuccess();
      });

      await service.uploadFile(options);

      expect(mockUpload.findPreviousUploads).toHaveBeenCalled();
      expect(mockUpload.resumeFromPreviousUpload).toHaveBeenCalledWith(previousUpload);
    });

    it("should use default content type when not provided", async () => {
      const file = Buffer.from("test content");
      const options = {
        bucketName: "imports",
        fileName: "test-file.json",
        file,
        metadata: {},
      };

      mockUpload.start.mockImplementation(() => {
        const onSuccess = (tus.Upload as any).mock.calls[0][1].onSuccess;
        onSuccess();
      });

      await service.uploadFile(options);

      expect(tus.Upload).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          metadata: expect.objectContaining({
            contentType: "application/json",
          }),
        })
      );
    });
  });

  describe("uploadJsonData", () => {
    it("should upload JSON data successfully", async () => {
      const data = { contacts: [{ name: "John", email: "john@example.com" }] };
      const metadata = { jobId: "test-job", source: "test-source" };
      const onProgress = vi.fn();

      mockUpload.start.mockImplementation(() => {
        const onSuccess = (tus.Upload as any).mock.calls[0][1].onSuccess;
        onSuccess();
      });

      const result = await service.uploadJsonData("test-file.json", data, metadata, onProgress);

      expect(tus.Upload).toHaveBeenCalledWith(
        Buffer.from(JSON.stringify(data), "utf-8"),
        expect.objectContaining({
          metadata: expect.objectContaining({
            bucketName: "imports",
            objectName: "test-file.json",
            contentType: "application/json",
            metadata: JSON.stringify(metadata),
          }),
        })
      );

      expect(result).toBe(mockUpload.url);
    });

    it("should use default metadata when not provided", async () => {
      const data = { contacts: [{ name: "John", email: "john@example.com" }] };

      mockUpload.start.mockImplementation(() => {
        const onSuccess = (tus.Upload as any).mock.calls[0][1].onSuccess;
        onSuccess();
      });

      await service.uploadJsonData("test-file.json", data);

      expect(tus.Upload).toHaveBeenCalledWith(
        Buffer.from(JSON.stringify(data), "utf-8"),
        expect.objectContaining({
          metadata: expect.objectContaining({
            metadata: JSON.stringify({}),
          }),
        })
      );
    });

    it("should handle upload errors for JSON data", async () => {
      const data = { contacts: [{ name: "John", email: "john@example.com" }] };
      const uploadError = new Error("JSON upload failed");

      mockUpload.start.mockImplementation(() => {
        const onError = (tus.Upload as any).mock.calls[0][1].onError;
        onError(uploadError);
      });

      await expect(service.uploadJsonData("test-file.json", data)).rejects.toThrow("JSON upload failed");
    });
  });

  describe("File upload scenarios", () => {
    it("should handle File objects", async () => {
      const file = new File(["test content"], "test.json", { type: "application/json" });
      const options = {
        bucketName: "imports",
        fileName: "test-file.json",
        file,
        metadata: {},
      };

      mockUpload.start.mockImplementation(() => {
        const onSuccess = (tus.Upload as any).mock.calls[0][1].onSuccess;
        onSuccess();
      });

      await service.uploadFile(options);

      expect(tus.Upload).toHaveBeenCalledWith(file, expect.any(Object));
    });

    it("should handle large files with progress tracking", async () => {
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      const file = Buffer.from(largeContent);
      const onProgress = vi.fn();
      const options = {
        bucketName: "imports",
        fileName: "large-file.json",
        file,
        contentType: "application/json",
        metadata: {},
        onProgress,
      };

      mockUpload.start.mockImplementation(() => {
        const onProgressCallback = (tus.Upload as any).mock.calls[0][1].onProgress;

        onProgressCallback(512 * 1024, 1024 * 1024);
        onProgressCallback(1024 * 1024, 1024 * 1024);
        const onSuccess = (tus.Upload as any).mock.calls[0][1].onSuccess;
        onSuccess();
      });

      await service.uploadFile(options);

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 512 * 1024, 1024 * 1024);
      expect(onProgress).toHaveBeenNthCalledWith(2, 1024 * 1024, 1024 * 1024);
    });

    it("should handle upload cancellation", async () => {
      const file = Buffer.from("test content");
      const options = {
        bucketName: "imports",
        fileName: "test-file.json",
        file,
        contentType: "application/json",
        metadata: {},
      };

      const cancelError = new Error("Upload cancelled");
      cancelError.name = "AbortError";

      mockUpload.start.mockImplementation(() => {
        const onError = (tus.Upload as any).mock.calls[0][1].onError;
        onError(cancelError);
      });

      await expect(service.uploadFile(options)).rejects.toThrow("Upload cancelled");
    });
  });
});
