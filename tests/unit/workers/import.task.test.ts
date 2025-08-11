import { describe, it, expect, beforeEach, vi } from "vitest";
import { ImportTaskProcessor } from "../../../src/workers/tasks/import.task.js";
import type { ImportJobPayload, ImportTaskDependencies, ImportTaskHelpers } from "../../../src/workers/tasks/import.task.js";
import { createTestContext } from "../../utils/test-helpers.js";

describe("ImportTaskProcessor", () => {
  let processor: ImportTaskProcessor;
  let mockDependencies: ImportTaskDependencies;
  let mockHelpers: ImportTaskHelpers;
  let mockPayload: ImportJobPayload;

  const { createMockImportJobPayload, createMockImportTaskDependencies, createMockImportTaskHelpers, createMockContact } =
    createTestContext();

  beforeEach(() => {
    mockDependencies = createMockImportTaskDependencies();
    mockHelpers = createMockImportTaskHelpers();
    mockPayload = createMockImportJobPayload();
    processor = new ImportTaskProcessor(mockDependencies);
  });

  describe("processImportJob", () => {
    it("should process import job successfully", async () => {
      const mockContacts = [
        { name: "John Doe", email: "john@example.com" },
        { name: "Jane Doe", email: "jane@example.com" },
      ];
      const mockJsonData = JSON.stringify(mockContacts);

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);
      (mockDependencies.contactRepository.createMany as any).mockResolvedValue([]);
      (mockDependencies.storageRepository.deleteFile as any).mockResolvedValue(undefined);

      await processor.processImportJob(mockPayload, mockHelpers);

      expect(mockDependencies.storageRepository.downloadFile).toHaveBeenCalledWith(`import-${mockPayload.jobId}.json`);
      expect(mockDependencies.storageRepository.deleteFile).toHaveBeenCalledWith(`import-${mockPayload.jobId}.json`);

      expect(mockDependencies.contactRepository.createMany).toHaveBeenCalledWith([
        { name: "John Doe", email: "john@example.com", source: mockPayload.source },
        { name: "Jane Doe", email: "jane@example.com", source: mockPayload.source },
      ]);

      expect(mockHelpers.logger.info).toHaveBeenCalledWith(
        `Processing import job ${mockPayload.jobId} from ${mockPayload.source}`
      );
      expect(mockHelpers.logger.info).toHaveBeenCalledWith(`Successfully processed 2 contacts for job ${mockPayload.jobId}`);
    });

    it("should handle contacts with missing name and email", async () => {
      const mockContacts = [
        { name: "", email: "" },
        { name: "Jane Doe", email: "jane@example.com" },
      ];
      const mockJsonData = JSON.stringify(mockContacts);

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);
      (mockDependencies.contactRepository.createMany as any).mockResolvedValue([]);
      (mockDependencies.storageRepository.deleteFile as any).mockResolvedValue(undefined);

      await processor.processImportJob(mockPayload, mockHelpers);

      expect(mockDependencies.contactRepository.createMany).toHaveBeenCalledWith([
        { name: "Unknown", email: "unknown@import.local", source: mockPayload.source },
        { name: "Jane Doe", email: "jane@example.com", source: mockPayload.source },
      ]);
    });

    it("should handle empty contacts array", async () => {
      const mockContacts: any[] = [];
      const mockJsonData = JSON.stringify(mockContacts);

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);
      (mockDependencies.contactRepository.createMany as any).mockResolvedValue([]);
      (mockDependencies.storageRepository.deleteFile as any).mockResolvedValue(undefined);

      await processor.processImportJob(mockPayload, mockHelpers);

      expect(mockDependencies.contactRepository.createMany).toHaveBeenCalledWith([]);
      expect(mockHelpers.logger.info).toHaveBeenCalledWith(`Successfully processed 0 contacts for job ${mockPayload.jobId}`);
    });

    it("should throw error for invalid JSON data format", async () => {
      const mockJsonData = "invalid json";

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);

      await expect(processor.processImportJob(mockPayload, mockHelpers)).rejects.toThrow();

      expect(mockHelpers.logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to process import job ${mockPayload.jobId}`)
      );
    });

    it("should throw error when data is not an array", async () => {
      const mockData = { contacts: [] };
      const mockJsonData = JSON.stringify(mockData);

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);

      await expect(processor.processImportJob(mockPayload, mockHelpers)).rejects.toThrow(
        "Invalid data format: expected array of contacts"
      );

      expect(mockHelpers.logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to process import job ${mockPayload.jobId}`)
      );
    });

    it("should throw error when storage download fails", async () => {
      const storageError = new Error("Storage download failed");
      (mockDependencies.storageRepository.downloadFile as any).mockRejectedValue(storageError);

      await expect(processor.processImportJob(mockPayload, mockHelpers)).rejects.toThrow(storageError);

      expect(mockHelpers.logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to process import job ${mockPayload.jobId}`)
      );
    });

    it("should throw error when contact creation fails", async () => {
      const mockContacts = [{ name: "John Doe", email: "john@example.com" }];
      const mockJsonData = JSON.stringify(mockContacts);
      const contactError = new Error("Contact creation failed");

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);
      (mockDependencies.contactRepository.createMany as any).mockRejectedValue(contactError);

      await expect(processor.processImportJob(mockPayload, mockHelpers)).rejects.toThrow(contactError);

      expect(mockHelpers.logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to process import job ${mockPayload.jobId}`)
      );
    });

    it("should throw error when file deletion fails", async () => {
      const mockContacts = [{ name: "John Doe", email: "john@example.com" }];
      const mockJsonData = JSON.stringify(mockContacts);
      const deletionError = new Error("File deletion failed");

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);
      (mockDependencies.contactRepository.createMany as any).mockResolvedValue([]);
      (mockDependencies.storageRepository.deleteFile as any).mockRejectedValue(deletionError);

      await expect(processor.processImportJob(mockPayload, mockHelpers)).rejects.toThrow(deletionError);

      expect(mockHelpers.logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to process import job ${mockPayload.jobId}`)
      );
    });

    it("should handle contacts with partial data", async () => {
      const mockContacts = [
        { name: "John Doe" },
        { email: "jane@example.com" },
        { name: "Bob Smith", email: "bob@example.com" },
      ];
      const mockJsonData = JSON.stringify(mockContacts);

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);
      (mockDependencies.contactRepository.createMany as any).mockResolvedValue([]);
      (mockDependencies.storageRepository.deleteFile as any).mockResolvedValue(undefined);

      await processor.processImportJob(mockPayload, mockHelpers);

      expect(mockDependencies.contactRepository.createMany).toHaveBeenCalledWith([
        { name: "John Doe", email: "unknown@import.local", source: mockPayload.source },
        { name: "Unknown", email: "jane@example.com", source: mockPayload.source },
        { name: "Bob Smith", email: "bob@example.com", source: mockPayload.source },
      ]);
    });

    it("should use correct file name format", async () => {
      const mockContacts = [{ name: "John Doe", email: "john@example.com" }];
      const mockJsonData = JSON.stringify(mockContacts);

      (mockDependencies.storageRepository.downloadFile as any).mockResolvedValue(mockJsonData);
      (mockDependencies.contactRepository.createMany as any).mockResolvedValue([]);
      (mockDependencies.storageRepository.deleteFile as any).mockResolvedValue(undefined);

      await processor.processImportJob(mockPayload, mockHelpers);

      const expectedFileName = `import-${mockPayload.jobId}.json`;
      expect(mockDependencies.storageRepository.downloadFile).toHaveBeenCalledWith(expectedFileName);
      expect(mockDependencies.storageRepository.deleteFile).toHaveBeenCalledWith(expectedFileName);
    });
  });
});
