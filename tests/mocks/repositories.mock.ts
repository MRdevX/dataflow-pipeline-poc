import { vi } from "vitest";

export const mockContactRepository = {
  createMany: vi.fn().mockResolvedValue([]),
  findAll: vi.fn().mockResolvedValue([]),
};

export const mockStorageRepository = {
  uploadFile: vi.fn().mockResolvedValue(undefined),
  downloadFile: vi.fn().mockResolvedValue(""),
  deleteFile: vi.fn().mockResolvedValue(undefined),
};

export const createContactRepositoryMock = () => ({
  ContactRepository: vi.fn().mockImplementation(() => mockContactRepository),
});

export const createStorageRepositoryMock = () => ({
  StorageRepository: vi.fn().mockImplementation(() => mockStorageRepository),
});

export const setupRepositoryMocks = () => {
  vi.mock("../../src/repositories/contact.repository.js", () => createContactRepositoryMock());
  vi.mock("../../src/repositories/storage.repository.js", () => createStorageRepositoryMock());
};
