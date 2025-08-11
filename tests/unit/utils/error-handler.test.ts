import { describe, it, expect } from "vitest";
import { handleError } from "../../../src/utils/error-handler.js";
import { createTestContext } from "../../utils/test-context.js";

describe("Error Handler", () => {
  createTestContext();

  describe("handleError", () => {
    it("should handle Error objects", () => {
      const originalError = new Error("Database connection failed");
      const context = "Failed to connect to database";

      const result = handleError(originalError, context);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("Failed to connect to database: Database connection failed");
    });

    it("should handle string errors", () => {
      const originalError = "Invalid input data";
      const context = "Failed to validate request";

      const result = handleError(originalError, context);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("Failed to validate request: Unknown error");
    });

    it("should handle null errors", () => {
      const originalError = null;
      const context = "Failed to process request";

      const result = handleError(originalError, context);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("Failed to process request: Unknown error");
    });

    it("should handle undefined errors", () => {
      const originalError = undefined;
      const context = "Failed to process request";

      const result = handleError(originalError, context);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("Failed to process request: Unknown error");
    });

    it("should handle object errors", () => {
      const originalError = { code: "E001", message: "Custom error" };
      const context = "Failed to process request";

      const result = handleError(originalError, context);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("Failed to process request: Unknown error");
    });

    it("should handle errors with empty message", () => {
      const originalError = new Error("");
      const context = "Failed to process request";

      const result = handleError(originalError, context);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("Failed to process request: ");
    });

    it("should handle empty context", () => {
      const originalError = new Error("Database error");
      const context = "";

      const result = handleError(originalError, context);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe(": Database error");
    });
  });
});
