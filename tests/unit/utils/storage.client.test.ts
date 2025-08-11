import { vi } from "vitest";

vi.mock("../../../src/config/index.js", () => ({
  config: {
    supabase: {
      url: "https://test.supabase.co",
      serviceRoleKey: "test-service-key",
    },
  },
}));

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StorageClient } from "../../../src/utils/storage.client.js";
import { createTestContext } from "../../utils/test-context.js";
import { createSuccessResponse, createErrorResponse } from "../../mocks/http.mock.js";
import { createMockRequestHeaders } from "../../fixtures/http.fixture.js";

describe("StorageClient", () => {
  let client: StorageClient;
  let originalFetch: any;

  createTestContext();

  beforeEach(() => {
    client = new StorageClient();
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("uploadFile", () => {
    it("should upload file successfully with default content type", async () => {
      const mockResponse = createSuccessResponse({ success: true });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "test-file.json";
      const data = JSON.stringify({ test: "data" });

      await client.uploadFile(bucket, fileName, data);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/test-file.json",
        expect.objectContaining({
          method: "POST",
          headers: createMockRequestHeaders(),
          body: data,
        })
      );
    });

    it("should upload file with custom content type", async () => {
      const mockResponse = createSuccessResponse({ success: true });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "test-file.txt";
      const data = "plain text content";
      const contentType = "text/plain";

      await client.uploadFile(bucket, fileName, data, contentType);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/test-file.txt",
        expect.objectContaining({
          method: "POST",
          headers: {
            ...createMockRequestHeaders(),
            "Content-Type": "text/plain",
          },
          body: data,
        })
      );
    });

    it("should handle empty data", async () => {
      const mockResponse = createSuccessResponse({ success: true });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "empty-file.txt";
      const data = "";

      await client.uploadFile(bucket, fileName, data);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/empty-file.txt",
        expect.objectContaining({
          method: "POST",
          body: "",
        })
      );
    });

    it("should handle large data", async () => {
      const mockResponse = createSuccessResponse({ success: true });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "large-file.json";
      const data = "x".repeat(10000);

      await client.uploadFile(bucket, fileName, data);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/large-file.json",
        expect.objectContaining({
          method: "POST",
          body: data,
        })
      );
    });

    it("should handle special characters in filename", async () => {
      const mockResponse = createSuccessResponse({ success: true });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "test-file-with-special-chars-@#$%.json";
      const data = JSON.stringify({ test: "data" });

      await client.uploadFile(bucket, fileName, data);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/test-file-with-special-chars-@#$%.json",
        expect.objectContaining({
          method: "POST",
          body: data,
        })
      );
    });

    it("should throw error when upload fails", async () => {
      const mockResponse = createErrorResponse(400, "Upload failed");
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "test-file.json";
      const data = JSON.stringify({ test: "data" });

      await expect(client.uploadFile(bucket, fileName, data)).rejects.toThrow(
        "StorageClient API error: 400 Error - Upload failed"
      );
    });
  });

  describe("downloadFile", () => {
    it("should download file successfully", async () => {
      const expectedData = JSON.stringify({ test: "data" });
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(expectedData),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "test-file.json";

      const result = await client.downloadFile(bucket, fileName);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/test-file.json",
        expect.objectContaining({
          method: "GET",
          headers: createMockRequestHeaders(),
        })
      );
      expect(result).toBe(expectedData);
    });

    it("should handle empty file content", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "empty-file.txt";

      const result = await client.downloadFile(bucket, fileName);

      expect(result).toBe("");
    });

    it("should handle large file content", async () => {
      const expectedData = "x".repeat(10000);
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(expectedData),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "large-file.txt";

      const result = await client.downloadFile(bucket, fileName);

      expect(result).toBe(expectedData);
    });

    it("should throw error when download fails", async () => {
      const mockResponse = createErrorResponse(404, "File not found");
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "non-existent-file.json";

      await expect(client.downloadFile(bucket, fileName)).rejects.toThrow(
        "StorageClient API error: 404 Error - File not found"
      );
    });

    it("should handle special characters in filename", async () => {
      const expectedData = "test content";
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(expectedData),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "test-file-with-special-chars-@#$%.txt";

      const result = await client.downloadFile(bucket, fileName);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/test-file-with-special-chars-@#$%.txt",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toBe(expectedData);
    });
  });

  describe("deleteFile", () => {
    it("should delete file successfully", async () => {
      const mockResponse = createSuccessResponse({ success: true });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "test-file.json";

      await client.deleteFile(bucket, fileName);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/test-file.json",
        expect.objectContaining({
          method: "DELETE",
          headers: createMockRequestHeaders(),
        })
      );
    });

    it("should throw error when delete fails", async () => {
      const mockResponse = createErrorResponse(404, "File not found");
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "non-existent-file.json";

      await expect(client.deleteFile(bucket, fileName)).rejects.toThrow(
        "StorageClient API error: 404 Error - File not found"
      );
    });

    it("should handle special characters in filename", async () => {
      const mockResponse = createSuccessResponse({ success: true });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const bucket = "test-bucket";
      const fileName = "test-file-with-special-chars-@#$%.json";

      await client.deleteFile(bucket, fileName);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/storage/v1/object/test-bucket/test-file-with-special-chars-@#$%.json",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      const bucket = "test-bucket";
      const fileName = "test-file.json";

      await expect(client.deleteFile(bucket, fileName)).rejects.toThrow(networkError);
    });
  });
});
