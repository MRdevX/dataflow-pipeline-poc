import { vi } from "vitest";

vi.mock("../../../src/utils/postgrest.client.js", () => ({
  postgrest: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock("../../../src/utils/error-handler.js", () => ({
  handleError: vi.fn((error, context) => new Error(`${context}: ${error.message}`)),
}));

import { describe, it, expect, beforeEach } from "vitest";
import { ContactRepository } from "../../../src/repositories/contact.repository.js";
import { postgrest } from "../../../src/utils/postgrest.client.js";
import { createMockContact, sampleContacts } from "../../fixtures/contacts.fixture.js";
import { createTestContext } from "../../utils/test-context.js";
import { createAsyncMock, createRejectedMock } from "../../utils/test-helpers.js";

describe("ContactRepository", () => {
  let contactRepository: ContactRepository;
  let mockPostgrest: any;

  createTestContext();

  beforeEach(() => {
    contactRepository = new ContactRepository();
    mockPostgrest = postgrest as any;
    vi.clearAllMocks();
  });

  describe("createMany", () => {
    it("should create multiple contacts successfully", async () => {
      const mockContacts = sampleContacts.map((contact) => ({
        ...contact,
        imported_at: expect.any(String),
      }));

      mockPostgrest.insert.mockResolvedValue(mockContacts);

      const result = await contactRepository.createMany(sampleContacts);

      expect(mockPostgrest.insert).toHaveBeenCalledWith("contacts", mockContacts);
      expect(result).toEqual(mockContacts);
    });

    it("should handle empty contacts array", async () => {
      mockPostgrest.insert.mockResolvedValue([]);

      const result = await contactRepository.createMany([]);

      expect(mockPostgrest.insert).toHaveBeenCalledWith("contacts", []);
      expect(result).toEqual([]);
    });

    it("should add imported_at timestamp to each contact", async () => {
      const expectedContacts = sampleContacts.map((contact) => ({
        ...contact,
        imported_at: expect.any(String),
      }));

      mockPostgrest.insert.mockResolvedValue(expectedContacts);

      await contactRepository.createMany(sampleContacts);

      const callArgs = mockPostgrest.insert.mock.calls[0][1];
      callArgs.forEach((contact: any) => {
        expect(contact.imported_at).toBeDefined();
        expect(new Date(contact.imported_at).getTime()).not.toBeNaN();
      });
    });

    it("should throw error when database insert fails", async () => {
      const dbError = new Error("Database connection failed");
      mockPostgrest.insert.mockRejectedValue(dbError);

      await expect(contactRepository.createMany(sampleContacts)).rejects.toThrow(
        "Failed to insert contacts: Database connection failed"
      );
    });

    it("should handle single contact creation", async () => {
      const singleContact = createMockContact();
      const expectedContact = {
        ...singleContact,
        imported_at: expect.any(String),
      };

      mockPostgrest.insert.mockResolvedValue([expectedContact]);

      const result = await contactRepository.createMany([singleContact]);

      expect(mockPostgrest.insert).toHaveBeenCalledWith("contacts", [expectedContact]);
      expect(result).toEqual([expectedContact]);
    });
  });

  describe("findAll", () => {
    it("should fetch contacts with default parameters", async () => {
      const mockContacts = sampleContacts.map((contact) => ({
        ...contact,
        id: "1",
        source: "Test Company",
        imported_at: "2024-01-01T00:00:00Z",
      }));

      mockPostgrest.select.mockResolvedValue(mockContacts);

      const result = await contactRepository.findAll();

      expect(mockPostgrest.select).toHaveBeenCalledWith("contacts", {
        limit: 100,
        offset: 0,
        orderBy: "imported_at.desc",
      });
      expect(result).toEqual(mockContacts);
    });

    it("should fetch contacts with custom limit and offset", async () => {
      const mockContacts = sampleContacts.slice(0, 2);
      mockPostgrest.select.mockResolvedValue(mockContacts);

      const result = await contactRepository.findAll(2, 5);

      expect(mockPostgrest.select).toHaveBeenCalledWith("contacts", {
        limit: 2,
        offset: 5,
        orderBy: "imported_at.desc",
      });
      expect(result).toEqual(mockContacts);
    });

    it("should handle empty result set", async () => {
      mockPostgrest.select.mockResolvedValue([]);

      const result = await contactRepository.findAll(10, 0);

      expect(result).toEqual([]);
    });

    it("should throw error when database select fails", async () => {
      const dbError = new Error("Database query failed");
      mockPostgrest.select.mockRejectedValue(dbError);

      await expect(contactRepository.findAll()).rejects.toThrow("Failed to fetch contacts: Database query failed");
    });

    it("should handle zero limit", async () => {
      mockPostgrest.select.mockResolvedValue([]);

      await contactRepository.findAll(0, 0);

      expect(mockPostgrest.select).toHaveBeenCalledWith("contacts", {
        limit: 0,
        offset: 0,
        orderBy: "imported_at.desc",
      });
    });
  });
});
