import { expect } from "vitest";

export const expectValidJobId = (result: any) => {
  expect(result).toHaveProperty("jobId");
  expect(typeof result.jobId).toBe("string");
  expect(result.jobId.length).toBeGreaterThan(0);
};

export const expectValidContact = (contact: any) => {
  expect(contact).toHaveProperty("name");
  expect(contact).toHaveProperty("email");
  expect(typeof contact.name).toBe("string");
  expect(typeof contact.email).toBe("string");
  expect(contact.name.length).toBeGreaterThan(0);
  expect(contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

export const expectValidImportRequest = (request: any) => {
  expect(request).toHaveProperty("source");
  expect(request).toHaveProperty("data");
  expect(typeof request.source).toBe("string");
  expect(Array.isArray(request.data)).toBe(true);
  expect(request.source.length).toBeGreaterThan(0);
};
