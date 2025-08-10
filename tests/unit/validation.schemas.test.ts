import { describe, it, expect } from "vitest";
import { importRequestSchema } from "../../src/validation/validation.schemas.js";
import { createTestContext } from "../utils/test-helpers.js";

describe("Validation Schemas", () => {
  const { createMockContact } = createTestContext();

  describe("importRequestSchema", () => {
    it("should validate correct import request data", () => {
      const validData = {
        source: "Test Company",
        data: Array.from({ length: 3 }, () => createMockContact()),
        useResumable: false,
      };

      const result = importRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate import request without useResumable (should default to false)", () => {
      const validData = {
        source: "Test Company",
        data: Array.from({ length: 2 }, () => createMockContact()),
      };

      const result = importRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.useResumable).toBe(false);
      }
    });

    it("should reject empty source", () => {
      const invalidData = {
        source: "",
        data: Array.from({ length: 1 }, () => createMockContact()),
      };

      const result = importRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject source longer than 100 characters", () => {
      const invalidData = {
        source: "a".repeat(101),
        data: Array.from({ length: 1 }, () => createMockContact()),
      };

      const result = importRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty data array", () => {
      const invalidData = {
        source: "Test Company",
        data: [],
      };

      const result = importRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject contact with empty name", () => {
      const invalidData = {
        source: "Test Company",
        data: [
          {
            name: "",
            email: "john@example.com",
          },
        ],
      };

      const result = importRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email format", () => {
      const invalidData = {
        source: "Test Company",
        data: [
          {
            name: "John Doe",
            email: "invalid-email",
          },
        ],
      };

      const result = importRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const invalidData = {
        source: "Test Company",
        data: [
          {
            name: "John Doe",
          },
        ],
      };

      const result = importRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
