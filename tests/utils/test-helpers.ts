import { vi, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import type { ImportRequest } from "../../src/models/job.model.js";

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

export const createTestContext = () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFaker();
  });

  return {
    createMockImportRequest,
    createMockContact,
    createMockFile,
  };
};
