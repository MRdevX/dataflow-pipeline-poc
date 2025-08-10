import { supabase } from "../utils/supabase.client.js";
import type { Contact, ContactInput } from "../models/contact.model.js";

export class ContactRepository {
  async createMany(contacts: ContactInput[]): Promise<Contact[]> {
    const contactsToInsert: Contact[] = contacts.map((contact) => ({
      ...contact,
      imported_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from("contacts").insert(contactsToInsert).select();

    if (error) {
      throw new Error(`Failed to insert contacts: ${error.message}`);
    }

    return data || [];
  }
}
