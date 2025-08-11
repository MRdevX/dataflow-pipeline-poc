import type { Task } from "graphile-worker";
import type { Contact } from "../../models/contact.model.js";
import { ContactRepository } from "../../repositories/contact.repository.js";
import { StorageRepository } from "../../repositories/storage.repository.js";

export interface ImportJobPayload {
  jobId: string;
  source: string;
}

export interface ImportTaskDependencies {
  contactRepository: ContactRepository;
  storageRepository: StorageRepository;
}

export interface ImportTaskHelpers {
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export class ImportTaskProcessor {
  constructor(private dependencies: ImportTaskDependencies) {}

  async processImportJob(payload: ImportJobPayload, helpers: ImportTaskHelpers): Promise<void> {
    const { jobId, source } = payload;
    const fileName = `import-${jobId}.json`;

    helpers.logger.info(`Processing import job ${jobId} from ${source}`);

    try {
      const jsonText = await this.dependencies.storageRepository.downloadFile(fileName);
      const contacts: Contact[] = JSON.parse(jsonText);

      if (!Array.isArray(contacts)) {
        throw new Error("Invalid data format: expected array of contacts");
      }

      const contactsToInsert = contacts.map((contact: Contact) => ({
        name: contact.name || "Unknown",
        email: contact.email || "unknown@import.local",
        source: source,
      }));

      await this.dependencies.contactRepository.createMany(contactsToInsert);

      await this.dependencies.storageRepository.deleteFile(fileName);

      helpers.logger.info(`Successfully processed ${contacts.length} contacts for job ${jobId}`);
    } catch (error) {
      helpers.logger.error(`Failed to process import job ${jobId}: ${error}`);
      throw error;
    }
  }
}

const defaultDependencies: ImportTaskDependencies = {
  contactRepository: new ContactRepository(),
  storageRepository: new StorageRepository(),
};

const defaultProcessor = new ImportTaskProcessor(defaultDependencies);

export const processImportJob: Task = async (payload, helpers) => {
  return defaultProcessor.processImportJob(payload as ImportJobPayload, helpers);
};
