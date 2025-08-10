import type { Contact, ContactInput } from "../models/contact.model.js";
import { handleError } from "../utils/error-handler.js";
import { postgrest } from "../utils/postgrest.client.js";

export class ContactRepository {
  async createMany(contacts: ContactInput[]): Promise<Contact[]> {
    const contactsToInsert: Contact[] = contacts.map((contact) => ({
      ...contact,
      imported_at: new Date().toISOString(),
    }));

    try {
      return await postgrest.insert<Contact>("contacts", contactsToInsert);
    } catch (error) {
      throw handleError(error, "Failed to insert contacts");
    }
  }

  async findAll(limit = 100, offset = 0): Promise<Contact[]> {
    try {
      return await postgrest.select<Contact>("contacts", {
        limit,
        offset,
        orderBy: "imported_at.desc",
      });
    } catch (error) {
      throw handleError(error, "Failed to fetch contacts");
    }
  }
}
