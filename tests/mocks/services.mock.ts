import { vi } from "vitest";

export const mockImportService = {
  processImport: vi.fn().mockResolvedValue({ jobId: "test-job-id" }),
};

export const mockResumableUploadService = {
  uploadFile: vi.fn().mockResolvedValue("https://example.com/uploaded-file"),
  uploadJsonData: vi.fn().mockResolvedValue("https://example.com/uploaded-file"),
};

export const createImportServiceMock = () => ({
  ImportService: vi.fn().mockImplementation(() => mockImportService),
});

export const createResumableUploadServiceMock = () => ({
  ResumableUploadService: vi.fn().mockImplementation(() => mockResumableUploadService),
});

export const setupServiceMocks = () => {
  vi.mock("../../src/services/import.service.js", () => createImportServiceMock());
  vi.mock("../../src/services/resumable-upload.service.js", () => createResumableUploadServiceMock());
};
