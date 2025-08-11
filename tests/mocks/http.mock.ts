import { vi } from "vitest";

export interface MockResponseOptions {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: any;
  text?: string;
}

export const createMockResponse = (options: MockResponseOptions = {}) => {
  const { ok = true, status = 200, statusText = "OK", json = {}, text = "" } = options;

  return {
    ok,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(json),
    text: vi.fn().mockResolvedValue(text),
  };
};

export const createSuccessResponse = (data: any = {}) => createMockResponse({ ok: true, status: 200, json: data });

export const createErrorResponse = (status: number = 500, message: string = "Error") =>
  createMockResponse({ ok: false, status, statusText: "Error", text: message });

export const setupFetchMock = () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  return {
    originalFetch,
    mockFetch: global.fetch as any,
  };
};
