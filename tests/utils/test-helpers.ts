import { vi, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import type { ImportRequest } from "../../src/models/job.model.js";
import type { ImportJobPayload, ImportTaskDependencies, ImportTaskHelpers } from "../../src/workers/tasks/import.task.js";

export const setupFaker = () => {
  faker.seed(123);
};

export const createMockImportRequest = (overrides: Partial<ImportRequest> = {}): ImportRequest => ({
  source: faker.company.name(),
  data: Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, () => ({
    name: faker.person.fullName(),
    email: faker.internet.email(),
  })),
  ...overrides,
});

export const createMockContact = () => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
});

export const createMockFile = () => Buffer.from(faker.lorem.paragraph());

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

export const createTestContext = () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFaker();
  });

  return {
    createMockImportRequest,
    createMockContact,
    createMockFile,
    createMockImportJobPayload,
    createMockImportTaskDependencies,
    createMockImportTaskHelpers,
  };
};
