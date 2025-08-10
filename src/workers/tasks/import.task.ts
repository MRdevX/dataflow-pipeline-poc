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

const processImportJob: Task = async (payload, helpers) => {
  const { jobId, source } = payload as ImportJobPayload;
  const fileName = `import-${jobId}.json`;

  helpers.logger.info(`Processing import job ${jobId} from ${source}`);

  try {
    const jsonText = await storageRepository.downloadFile(fileName);
    const contacts: Contact[] = JSON.parse(jsonText);

    if (!Array.isArray(contacts)) {
      throw new Error("Invalid data format: expected array of contacts");
    }

    const contactsToInsert = contacts.map((contact: Contact) => ({
      name: contact.name || "Unknown",
      email: contact.email || "unknown@import.local",
      source: source,
    }));

    await contactRepository.createMany(contactsToInsert);

    await storageRepository.deleteFile(fileName);

    helpers.logger.info(`Successfully processed ${contacts.length} contacts for job ${jobId}`);
  } catch (error) {
    helpers.logger.error(`Failed to process import job ${jobId}: ${error}`);
    throw error;
  }
};

export default processImportJob;
