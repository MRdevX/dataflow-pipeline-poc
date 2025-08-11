import { vi, beforeEach, afterEach } from "vitest";
import { setupFetchMock } from "../mocks/http.mock.js";

export interface TestSetupOptions {
  useFetchMock?: boolean;
  clearMocks?: boolean;
}

export const createTestSetup = (options: TestSetupOptions = {}) => {
  const { useFetchMock = false, clearMocks = true } = options;

  let fetchMock: any = null;

  beforeEach(() => {
    if (clearMocks) {
      vi.clearAllMocks();
    }

    if (useFetchMock) {
      const originalFetch = global.fetch;
      global.fetch = vi.fn();
      fetchMock = global.fetch;

      afterEach(() => {
        global.fetch = originalFetch;
      });
    }
  });

  return {
    fetchMock,
  };
};

export const createMockClass = <T>(methods: Record<string, any> = {}): T => {
  return Object.fromEntries(
    Object.entries(methods).map(([key, value]) => [
      key,
      typeof value === "function" ? vi.fn().mockImplementation(value) : value,
    ])
  ) as T;
};

export const createAsyncMock = <T>(returnValue: T) => vi.fn().mockResolvedValue(returnValue);

export const createRejectedMock = (error: Error | string) =>
  vi.fn().mockRejectedValue(typeof error === "string" ? new Error(error) : error);
