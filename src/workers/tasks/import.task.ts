import type { Task } from "graphile-worker";
import type { Contact } from "../../models/contact.model.js";
import { ContactRepository } from "../../repositories/contact.repository.js";
import { StorageRepository } from "../../repositories/storage.repository.js";

export interface ImportJobPayload {
	jobId: string;
	source: string;
}

const contactRepository = new ContactRepository();
const storageRepository = new StorageRepository();

const processImportJob: Task = async (payload) => {
	const { jobId, source } = payload as ImportJobPayload;
	const fileName = `import-${jobId}.json`;

	try {
		const jsonText = await storageRepository.downloadFile(fileName);
		const contacts: Contact[] = JSON.parse(jsonText);

		const contactsToInsert = contacts.map((contact: Contact) => ({
			name: contact.name,
			email: contact.email,
			source: source,
		}));

		await contactRepository.createMany(contactsToInsert);

		await storageRepository.deleteFile(fileName);

		console.log(
			`Successfully processed import job ${jobId} with ${contacts.length} contacts`,
		);
	} catch (error) {
		console.error(`Failed to process import job ${jobId}:`, error);
		throw error;
	}
};

export default processImportJob;
