import { faker } from "@faker-js/faker";
import type { ImportJobPayload, ImportTaskDependencies, ImportTaskHelpers } from "../../src/workers/tasks/import.task.js";
import { vi } from "vitest";
import { generateJobId } from "../../src/utils/general.utils.js";

export const createMockImportJobPayload = (overrides: Partial<ImportJobPayload> = {}): ImportJobPayload => ({
  jobId: generateJobId(),
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
    jobId: generateJobId(),
    source: "Test Company",
  },
  withLongSource: {
    jobId: generateJobId(),
    source: "Very Long Company Name That Exceeds Normal Limits",
  },
};
