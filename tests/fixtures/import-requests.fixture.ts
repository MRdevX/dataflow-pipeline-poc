import { faker } from "@faker-js/faker";
import type { ImportRequest } from "../../src/models/job.model.js";
import { createMockContacts } from "./contacts.fixture.js";

export const createMockImportRequest = (overrides: Partial<ImportRequest> = {}): ImportRequest => ({
  source: faker.company.name(),
  data: createMockContacts(faker.number.int({ min: 2, max: 5 })),
  useResumable: false,
  ...overrides,
});

export const validImportRequests = {
  basic: {
    source: "Test Company",
    data: [
      { name: "John Doe", email: "john@example.com" },
      { name: "Jane Doe", email: "jane@example.com" },
    ],
    useResumable: false,
  },
  withResumable: {
    source: "Test Company",
    data: [
      { name: "John Doe", email: "john@example.com" },
    ],
    useResumable: true,
  },
  emptyData: {
    source: "Test Company",
    data: [],
    useResumable: false,
  },
};

export const invalidImportRequests = {
  emptySource: {
    source: "",
    data: [{ name: "John Doe", email: "john@example.com" }],
    useResumable: false,
  },
  invalidEmail: {
    source: "Test Company",
    data: [{ name: "John Doe", email: "invalid-email" }],
    useResumable: false,
  },
  missingName: {
    source: "Test Company",
    data: [{ email: "john@example.com" }],
    useResumable: false,
  },
};
