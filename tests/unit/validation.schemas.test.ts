import { describe, it, expect } from "vitest";
import { importRequestSchema } from "../../src/validation/validation.schemas.js";
import { createTestContext } from "../utils/test-context.js";
import { createMockContact, sampleContacts, invalidContacts } from "../fixtures/contacts.fixture.js";
import { validImportRequests, invalidImportRequests } from "../fixtures/import-requests.fixture.js";

describe("Validation Schemas", () => {
  createTestContext();

  describe("importRequestSchema", () => {
    it("should validate correct import request data", () => {
      const validData = {
        source: "Test Company",
        data: sampleContacts,
        useResumable: false,
      };

      const result = importRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate import request without useResumable (should default to false)", () => {
      const validData = {
        source: "Test Company",
        data: sampleContacts.slice(0, 2),
      };

      const result = importRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.useResumable).toBe(false);
      }
    });

    it("should reject empty source", () => {
      const result = importRequestSchema.safeParse(invalidImportRequests.emptySource);
      expect(result.success).toBe(false);
    });

    it("should reject source longer than 100 characters", () => {
      const invalidData = {
        source: "a".repeat(101),
        data: [createMockContact()],
      };

      const result = importRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty data array", () => {
      const result = importRequestSchema.safeParse(validImportRequests.emptyData);
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
      const result = importRequestSchema.safeParse(invalidImportRequests.invalidEmail);
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const result = importRequestSchema.safeParse(invalidImportRequests.missingName);
      expect(result.success).toBe(false);
    });
  });
});
