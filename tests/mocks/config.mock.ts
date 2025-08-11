import { vi } from "vitest";

export const mockConfig = {
  env: "development",
  port: 3000,
  database: {
    url: "postgresql://test:test@localhost:5432/test",
  },
  supabase: {
    url: "https://test.supabase.co",
    serviceRoleKey: "test-service-key",
    anonKey: "test-anon-key",
  },
  worker: {
    concurrency: 10,
    pollInterval: 500,
  },
  upload: {
    chunkSize: 6 * 1024 * 1024,
    retryDelays: [0, 1000, 3000, 5000],
    cacheControl: "public, max-age=31536000",
    defaultContentType: "application/json",
  },
  metrics: {
    enabled: false,
  },
};

export const createConfigMock = () => ({
  config: mockConfig,
});

export const setupConfigMock = () => {
  vi.mock("../../src/config/index.js", () => createConfigMock());
};
