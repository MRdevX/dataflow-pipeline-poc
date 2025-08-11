import { faker } from "@faker-js/faker";

export const createMockRequestData = () => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  id: faker.string.uuid(),
});

export const createMockRequestHeaders = (overrides = {}) => ({
  "Content-Type": "application/json",
  Authorization: "Bearer test-service-key",
  apikey: "test-service-key",
  ...overrides,
});

export const createMockApiResponse = (data: any = {}) => ({
  data,
  success: true,
  timestamp: new Date().toISOString(),
});

export const createMockErrorResponse = (message: string = "API Error") => ({
  error: message,
  success: false,
  timestamp: new Date().toISOString(),
});

export const sampleApiEndpoints = {
  users: "/api/users",
  contacts: "/api/contacts",
  health: "/health",
  metrics: "/metrics",
};

export const sampleHttpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
