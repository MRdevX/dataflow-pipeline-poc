import { createClient } from "@supabase/supabase-js";
import { config } from "../config/index.js";
import type { Contact, ContactInput } from "../models/contact.model.js";

const supabase = createClient(
	config.supabase.url,
	config.supabase.serviceRoleKey,
);

export class ContactRepository {
	async createMany(contacts: ContactInput[]): Promise<Contact[]> {
		const contactsToInsert: Contact[] = contacts.map((contact) => ({
			...contact,
			imported_at: new Date().toISOString(),
		}));

		const { data, error } = await supabase
			.from("contacts")
			.insert(contactsToInsert)
			.select();

		if (error) {
			throw new Error(`Failed to insert contacts: ${error.message}`);
		}

		return data || [];
	}
}
