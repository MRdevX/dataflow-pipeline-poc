import { faker } from "@faker-js/faker";
import type { ImportJobPayload, ImportTaskDependencies, ImportTaskHelpers } from "../../src/workers/tasks/import.task.js";
import { vi } from "vitest";

export const createMockImportJobPayload = (overrides: Partial<ImportJobPayload> = {}): ImportJobPayload => ({
  jobId: faker.string.uuid(),
  source: faker.company.name(),
  ...overrides,
});

export const createMockImportTaskDependencies = (): ImportTaskDependencies => ({
  contactRepository: {
    createMany: vi.fn().mockResolvedValue([]),
  } as any,
  storageRepository: {
    downloadFile: vi.fn().mockResolvedValue(""),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  } as any,
});

export const createMockImportTaskHelpers = (): ImportTaskHelpers => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
});

export const sampleJobPayloads = {
  basic: {
    jobId: "test-job-123",
    source: "Test Company",
  },
  withLongSource: {
    jobId: "test-job-456",
    source: "Very Long Company Name That Exceeds Normal Limits",
  },
};
