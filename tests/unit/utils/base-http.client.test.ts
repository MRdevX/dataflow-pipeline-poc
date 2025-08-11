import { vi } from "vitest";

vi.mock("../../../src/config/index.js", () => ({
  config: {
    supabase: {
      serviceRoleKey: "test-service-key",
    },
  },
}));

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BaseHttpClient } from "../../../src/utils/base-http.client.js";
import { createTestContext } from "../../utils/test-context.js";
import { createMockResponse, createSuccessResponse, createErrorResponse } from "../../mocks/http.mock.js";
import { createMockRequestData, createMockRequestHeaders, sampleApiEndpoints } from "../../fixtures/http.fixture.js";

class TestHttpClient extends BaseHttpClient {
  constructor() {
    super("https://api.test.com");
  }

  async testRequest(endpoint: string, options: RequestInit = {}) {
    return this.makeRequest(endpoint, options);
  }
}

describe("BaseHttpClient", () => {
  let client: TestHttpClient;
  let originalFetch: any;

  createTestContext();

  beforeEach(() => {
    client = new TestHttpClient();
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("makeRequest", () => {
    it("should make successful GET request", async () => {
      const mockResponse = createSuccessResponse({ data: "test" });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await client.testRequest("/test", { method: "GET" });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          method: "GET",
          headers: createMockRequestHeaders(),
        })
      );
      expect(response).toBe(mockResponse);
    });

    it("should make successful POST request with body", async () => {
      const requestData = createMockRequestData();
      const mockResponse = createSuccessResponse({ id: "123" });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await client.testRequest("/create", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(requestData),
          headers: createMockRequestHeaders(),
        })
      );
      expect(response).toBe(mockResponse);
    });

    it("should override default headers with custom headers", async () => {
      const mockResponse = createSuccessResponse({ data: "test" });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const customHeaders = {
        "Custom-Header": "custom-value",
        "Content-Type": "application/xml",
      };

      await client.testRequest("/test", {
        method: "GET",
        headers: customHeaders,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          method: "GET",
          headers: {
            ...createMockRequestHeaders(),
            ...customHeaders,
          },
        })
      );
    });

    it("should throw error for 4xx status codes", async () => {
      const mockResponse = createErrorResponse(400, "Invalid request data");
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.testRequest("/test", { method: "GET" })).rejects.toThrow(
        "TestHttpClient API error: 400 Error - Invalid request data"
      );
    });

    it("should throw error for 5xx status codes", async () => {
      const mockResponse = createErrorResponse(500, "Server error occurred");
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.testRequest("/test", { method: "GET" })).rejects.toThrow(
        "TestHttpClient API error: 500 Error - Server error occurred"
      );
    });

    it("should truncate long error messages", async () => {
      const longErrorMessage = "a".repeat(300);
      const mockResponse = createErrorResponse(500, longErrorMessage);
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.testRequest("/test", { method: "GET" })).rejects.toThrow(
        "TestHttpClient API error: 500 Error - " + "a".repeat(200) + "..."
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(client.testRequest("/test", { method: "GET" })).rejects.toThrow(networkError);
    });

    it("should handle empty response body", async () => {
      const mockResponse = createMockResponse({ ok: true, status: 204, text: "" });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await client.testRequest("/test", { method: "DELETE" });

      expect(response).toBe(mockResponse);
    });

    it("should handle request with no options", async () => {
      const mockResponse = createSuccessResponse({ data: "test" });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await client.testRequest("/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: createMockRequestHeaders(),
        })
      );
      expect(response).toBe(mockResponse);
    });

    it("should handle request with empty options object", async () => {
      const mockResponse = createSuccessResponse({ data: "test" });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await client.testRequest("/test", {});

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: createMockRequestHeaders(),
        })
      );
      expect(response).toBe(mockResponse);
    });

    it("should handle request with undefined headers", async () => {
      const mockResponse = createSuccessResponse({ data: "test" });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await client.testRequest("/test", { headers: undefined });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: createMockRequestHeaders(),
        })
      );
      expect(response).toBe(mockResponse);
    });
  });
});
