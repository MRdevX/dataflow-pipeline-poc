import { vi } from "vitest";

vi.mock("../../../src/config/index.js", () => ({
  config: {
    supabase: {
      url: "https://test.supabase.co",
      serviceRoleKey: "test-service-key",
    },
  },
}));

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PostgRESTClient } from "../../../src/utils/postgrest.client.js";
import { createTestContext } from "../../utils/test-context.js";

describe("PostgRESTClient", () => {
  let client: PostgRESTClient;
  let originalFetch: any;

  createTestContext();

  beforeEach(() => {
    client = new PostgRESTClient();
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("insert", () => {
    it("should insert single record successfully", async () => {
      const mockData = { name: "John Doe", email: "john@example.com" };
      const mockResponse = {
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue([{ id: "1", ...mockData }]),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await client.insert("contacts", mockData);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/rest/v1/contacts",
        expect.objectContaining({
          method: "POST",
          headers: {
            Prefer: "return=representation",
            "Content-Type": "application/json",
            Authorization: "Bearer test-service-key",
            apikey: "test-service-key",
          },
          body: JSON.stringify(mockData),
        })
      );
      expect(result).toEqual([{ id: "1", ...mockData }]);
    });

    it("should insert multiple records successfully", async () => {
      const mockData = [
        { name: "John Doe", email: "john@example.com" },
        { name: "Jane Doe", email: "jane@example.com" },
      ];
      const mockResponse = {
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue([
          { id: "1", ...mockData[0] },
          { id: "2", ...mockData[1] },
        ]),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await client.insert("contacts", mockData);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/rest/v1/contacts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(mockData),
        })
      );
      expect(result).toEqual([
        { id: "1", ...mockData[0] },
        { id: "2", ...mockData[1] },
      ]);
    });

    it("should handle empty array", async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue([]),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await client.insert("contacts", []);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/rest/v1/contacts",
        expect.objectContaining({
          body: JSON.stringify([]),
        })
      );
      expect(result).toEqual([]);
    });

    it("should throw error when insert fails", async () => {
      const mockData = { name: "John Doe", email: "john@example.com" };
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: vi.fn().mockResolvedValue("Invalid data"),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.insert("contacts", mockData)).rejects.toThrow(
        "PostgRESTClient API error: 400 Bad Request - Invalid data"
      );
    });
  });

  describe("select", () => {
    it("should select records with default options", async () => {
      const mockData = [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Doe", email: "jane@example.com" },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockData),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await client.select("contacts");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/rest/v1/contacts",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual(mockData);
    });

    it("should select records with all options", async () => {
      const mockData = [{ id: "1", name: "John Doe", email: "john@example.com" }];
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockData),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const options = {
        select: "id,name,email",
        filters: { source: "test" },
        limit: 10,
        offset: 5,
        orderBy: "name.asc",
      };

      const result = await client.select("contacts", options);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/rest/v1/contacts?select=id%2Cname%2Cemail&source=test&limit=10&offset=5&order=name.asc",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual(mockData);
    });

    it("should handle empty result set", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([]),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await client.select("contacts", { limit: 10 });

      expect(result).toEqual([]);
    });

    it("should throw error when select fails", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: vi.fn().mockResolvedValue("Database error"),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(client.select("contacts")).rejects.toThrow(
        "PostgRESTClient API error: 500 Internal Server Error - Database error"
      );
    });

    it("should handle special characters in filters", async () => {
      const mockData = [{ id: "1", name: "John Doe" }];
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockData),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await client.select("contacts", {
        filters: { name: "John Doe", email: "john@example.com" },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/rest/v1/contacts?name=John+Doe&email=john%40example.com",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual(mockData);
    });
  });
});
