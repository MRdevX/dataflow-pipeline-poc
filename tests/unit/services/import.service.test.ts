import { describe, it, expect, beforeEach, vi } from "vitest";
import { ImportService } from "../../../src/services/import.service.js";
import { ImportError } from "../../../src/types/import.types.js";
import { createTestContext } from "../../utils/test-context.js";
import { sampleContacts } from "../../fixtures/contacts.fixture.js";

vi.mock("../../../src/repositories/storage.repository.js", () => ({
  StorageRepository: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../../src/services/resumable-upload.service.js", () => ({
  ResumableUploadService: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn().mockResolvedValue("resumable-url"),
    uploadJsonData: vi.fn().mockResolvedValue("resumable-url"),
  })),
}));

vi.mock("../../../src/workers/worker-utils.js", () => ({
  addJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/constants/storage.constants.js", () => ({
  STORAGE_BUCKETS: {
    IMPORTS: "imports",
  },
  CONTENT_TYPES: {
    JSON: "application/json",
  },
}));

describe("ImportService", () => {
  let importService: ImportService;

  createTestContext();

  beforeEach(() => {
    vi.clearAllMocks();
    importService = new ImportService();
  });

  describe("import method", () => {
    describe("JSON Import Request", () => {
      it("should process JSON import request successfully", async () => {
        const importRequest = {
          source: "Test Company",
          data: sampleContacts,
          useResumable: false,
        };

        const result = await importService.import(importRequest, "Test Company", false);

        expect(result).toHaveProperty("jobId");
      });

      it("should process JSON import request with resumable upload", async () => {
        const importRequest = {
          source: "Test Company",
          data: sampleContacts,
          useResumable: true,
        };

        const result = await importService.import(importRequest, "Test Company", true);

        expect(result).toHaveProperty("jobId");
      });

      it("should use default useResumable value when not provided", async () => {
        const importRequest = {
          source: "Test Company",
          data: sampleContacts,
        };

        const result = await importService.import(importRequest, "Test Company");

        expect(result).toHaveProperty("jobId");
      });
    });

    describe("File Upload", () => {
      it("should process file upload successfully", async () => {
        const file = new File([JSON.stringify(sampleContacts)], "contacts.json", {
          type: "application/json",
        });

        const result = await importService.import(file, "Test Company", false);

        expect(result).toHaveProperty("jobId");
      });

      it("should process file upload with resumable upload", async () => {
        const file = new File([JSON.stringify(sampleContacts)], "contacts.json", {
          type: "application/json",
        });

        const result = await importService.import(file, "Test Company", true);

        expect(result).toHaveProperty("jobId");
      });

      it("should handle file read errors", async () => {
        const file = new File([JSON.stringify(sampleContacts)], "contacts.json", {
          type: "application/json",
        });

        vi.spyOn(file, "arrayBuffer").mockRejectedValue(new Error("File read failed"));

        await expect(importService.import(file, "Test Company", false)).rejects.toThrow(
          "Failed to read file: File read failed"
        );
      });
    });

    describe("Stream Upload", () => {
      it("should process stream upload successfully", async () => {
        const streamData = JSON.stringify(sampleContacts);
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(streamData));
            controller.close();
          },
        });

        const result = await importService.import(stream, "Test Company", false);

        expect(result).toHaveProperty("jobId");
      });

      it("should process stream upload with resumable upload", async () => {
        const streamData = JSON.stringify(sampleContacts);
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(streamData));
            controller.close();
          },
        });

        const result = await importService.import(stream, "Test Company", true);

        expect(result).toHaveProperty("jobId");
      });

      it("should handle stream read errors", async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.error(new Error("Stream read failed"));
          },
        });

        await expect(importService.import(stream, "Test Company", false)).rejects.toThrow(
          "Failed to read stream: Stream read failed"
        );
      });

      it("should handle stream with multiple chunks", async () => {
        const streamData = JSON.stringify(sampleContacts);
        const chunk1 = streamData.slice(0, 10);
        const chunk2 = streamData.slice(10);

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(chunk1));
            controller.enqueue(new TextEncoder().encode(chunk2));
            controller.close();
          },
        });

        const result = await importService.import(stream, "Test Company", false);

        expect(result).toHaveProperty("jobId");
      });
    });

    describe("Error Handling", () => {
      it("should throw ImportError for unsupported input type", async () => {
        const unsupportedInput = "not supported";

        await expect(importService.import(unsupportedInput as any, "Test Company")).rejects.toThrow(
          "Unsupported input type"
        );
      });
    });
  });

  describe("processImport method", () => {
    it("should process import request with useResumable from request", async () => {
      const importRequest = {
        source: "Test Company",
        data: sampleContacts,
        useResumable: true,
      };

      const result = await importService.processImport(importRequest);

      expect(result).toHaveProperty("jobId");
    });

    it("should process import request with custom useResumable parameter", async () => {
      const importRequest = {
        source: "Test Company",
        data: sampleContacts,
        useResumable: false,
      };

      const result = await importService.processImport(importRequest, true);

      expect(result).toHaveProperty("jobId");
    });
  });

  describe("processFileUpload method", () => {
    it("should process file upload with useResumable parameter", async () => {
      const file = new File([JSON.stringify(sampleContacts)], "contacts.json", {
        type: "application/json",
      });

      const result = await importService.processFileUpload(file, "Test Company", true);

      expect(result).toHaveProperty("jobId");
    });
  });

  describe("processStreamUpload method", () => {
    it("should process stream upload with useResumable parameter", async () => {
      const streamData = JSON.stringify(sampleContacts);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(streamData));
          controller.close();
        },
      });

      const result = await importService.processStreamUpload(stream, "Test Company", true);

      expect(result).toHaveProperty("jobId");
    });
  });

  describe("Input type detection", () => {
    it("should correctly identify ImportRequest", () => {
      const importRequest = {
        source: "Test Company",
        data: sampleContacts,
      };

      const result = (importService as any).isImportRequest(importRequest);
      expect(result).toBe(true);
    });

    it("should correctly identify File objects", () => {
      const file = new File([], "test.json");
      const result = (importService as any).isFile(file);
      expect(result).toBe(true);
    });

    it("should correctly identify ReadableStream", () => {
      const stream = new ReadableStream();
      const result = (importService as any).isReadableStream(stream);
      expect(result).toBe(true);
    });

    it("should reject invalid input types", () => {
      expect((importService as any).isImportRequest("not an object")).toBe(false);
      expect((importService as any).isFile("not a file")).toBe(false);
      expect((importService as any).isReadableStream("not a stream")).toBe(false);
    });
  });

  describe("Metadata creation", () => {
    it("should create metadata with timestamp", () => {
      const baseMetadata = {
        jobId: "test-job",
        source: "Test Company",
      };

      const result = (importService as any).createMetadata(baseMetadata);

      expect(result).toHaveProperty("jobId", "test-job");
      expect(result).toHaveProperty("source", "Test Company");
      expect(result).toHaveProperty("timestamp");
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it("should use provided timestamp", () => {
      const baseMetadata = {
        jobId: "test-job",
        source: "Test Company",
        timestamp: "2023-01-01T00:00:00.000Z",
      };

      const result = (importService as any).createMetadata(baseMetadata);

      expect(result.timestamp).toBe("2023-01-01T00:00:00.000Z");
    });
  });
});
