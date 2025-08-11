import { vi } from "vitest";

vi.mock("../../../src/utils/storage.client.js", () => ({
  storage: {
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock("../../../src/utils/error-handler.js", () => ({
  handleError: vi.fn((error, context) => new Error(`${context}: ${error.message}`)),
}));

vi.mock("../../../src/constants/storage.constants.js", () => ({
  STORAGE_BUCKETS: {
    IMPORTS: "imports",
  },
  CONTENT_TYPES: {
    JSON: "application/json",
  },
}));

import { describe, it, expect, beforeEach } from "vitest";
import { StorageRepository } from "../../../src/repositories/storage.repository.js";
import { storage } from "../../../src/utils/storage.client.js";
import { createTestContext } from "../../utils/test-context.js";
import { createAsyncMock, createRejectedMock } from "../../utils/test-helpers.js";

describe("StorageRepository", () => {
  let storageRepository: StorageRepository;
  let mockStorage: any;

  createTestContext();

  beforeEach(() => {
    storageRepository = new StorageRepository();
    mockStorage = storage as any;
    vi.clearAllMocks();
  });

  describe("uploadFile", () => {
    it("should upload file successfully", async () => {
      const fileName = "test-file.json";
      const data = JSON.stringify({ test: "data" });

      mockStorage.uploadFile.mockResolvedValue(undefined);

      await storageRepository.uploadFile(fileName, data);

      expect(mockStorage.uploadFile).toHaveBeenCalledWith("imports", fileName, data, "application/json");
    });

    it("should handle empty data", async () => {
      const fileName = "empty-file.json";
      const data = "";

      mockStorage.uploadFile.mockResolvedValue(undefined);

      await storageRepository.uploadFile(fileName, data);

      expect(mockStorage.uploadFile).toHaveBeenCalledWith("imports", fileName, data, "application/json");
    });

    it("should throw error when upload fails", async () => {
      const fileName = "test-file.json";
      const data = JSON.stringify({ test: "data" });
      const uploadError = new Error("Upload failed");

      mockStorage.uploadFile.mockRejectedValue(uploadError);

      await expect(storageRepository.uploadFile(fileName, data)).rejects.toThrow("Failed to upload file: Upload failed");
    });

    it("should handle large data", async () => {
      const fileName = "large-file.json";
      const data = "x".repeat(10000);

      mockStorage.uploadFile.mockResolvedValue(undefined);

      await storageRepository.uploadFile(fileName, data);

      expect(mockStorage.uploadFile).toHaveBeenCalledWith("imports", fileName, data, "application/json");
    });

    it("should handle special characters in filename", async () => {
      const fileName = "test-file-with-special-chars-@#$%.json";
      const data = JSON.stringify({ test: "data" });

      mockStorage.uploadFile.mockResolvedValue(undefined);

      await storageRepository.uploadFile(fileName, data);

      expect(mockStorage.uploadFile).toHaveBeenCalledWith("imports", fileName, data, "application/json");
    });
  });

  describe("downloadFile", () => {
    it("should download file successfully", async () => {
      const fileName = "test-file.json";
      const expectedData = JSON.stringify({ test: "data" });

      mockStorage.downloadFile.mockResolvedValue(expectedData);

      const result = await storageRepository.downloadFile(fileName);

      expect(mockStorage.downloadFile).toHaveBeenCalledWith("imports", fileName);
      expect(result).toBe(expectedData);
    });

    it("should handle empty file content", async () => {
      const fileName = "empty-file.json";
      const expectedData = "";

      mockStorage.downloadFile.mockResolvedValue(expectedData);

      const result = await storageRepository.downloadFile(fileName);

      expect(result).toBe(expectedData);
    });

    it("should throw error when download fails", async () => {
      const fileName = "test-file.json";
      const downloadError = new Error("Download failed");

      mockStorage.downloadFile.mockRejectedValue(downloadError);

      await expect(storageRepository.downloadFile(fileName)).rejects.toThrow("Failed to download file: Download failed");
    });

    it("should handle large file content", async () => {
      const fileName = "large-file.json";
      const expectedData = "x".repeat(10000);

      mockStorage.downloadFile.mockResolvedValue(expectedData);

      const result = await storageRepository.downloadFile(fileName);

      expect(result).toBe(expectedData);
    });

    it("should handle non-existent file", async () => {
      const fileName = "non-existent-file.json";
      const notFoundError = new Error("File not found");

      mockStorage.downloadFile.mockRejectedValue(notFoundError);

      await expect(storageRepository.downloadFile(fileName)).rejects.toThrow("Failed to download file: File not found");
    });
  });

  describe("deleteFile", () => {
    it("should delete file successfully", async () => {
      const fileName = "test-file.json";

      mockStorage.deleteFile.mockResolvedValue(undefined);

      await storageRepository.deleteFile(fileName);

      expect(mockStorage.deleteFile).toHaveBeenCalledWith("imports", fileName);
    });

    it("should throw error when delete fails", async () => {
      const fileName = "test-file.json";
      const deleteError = new Error("Delete failed");

      mockStorage.deleteFile.mockRejectedValue(deleteError);

      await expect(storageRepository.deleteFile(fileName)).rejects.toThrow("Failed to delete file: Delete failed");
    });

    it("should handle non-existent file deletion", async () => {
      const fileName = "non-existent-file.json";
      const notFoundError = new Error("File not found");

      mockStorage.deleteFile.mockRejectedValue(notFoundError);

      await expect(storageRepository.deleteFile(fileName)).rejects.toThrow("Failed to delete file: File not found");
    });

    it("should handle special characters in filename", async () => {
      const fileName = "test-file-with-special-chars-@#$%.json";

      mockStorage.deleteFile.mockResolvedValue(undefined);

      await storageRepository.deleteFile(fileName);

      expect(mockStorage.deleteFile).toHaveBeenCalledWith("imports", fileName);
    });
  });
});
