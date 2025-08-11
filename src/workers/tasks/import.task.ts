import type { Task } from "graphile-worker";
import { ContactRepository } from "../../repositories/contact.repository.js";
import { StorageRepository } from "../../repositories/storage.repository.js";
import { z } from "zod";

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

const importedContactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.email(),
});

const importedContactsArraySchema = z.array(importedContactSchema).min(1);

export class ImportTaskProcessor {
  constructor(private dependencies: ImportTaskDependencies) {}

  async processImportJob(payload: ImportJobPayload, helpers: ImportTaskHelpers): Promise<void> {
    const { jobId, source } = payload;
    const fileName = `import-${jobId}.json`;

    helpers.logger.info(`Processing import job ${jobId} from ${source}`);

    try {
      const jsonText = await this.dependencies.storageRepository.downloadFile(fileName);
      const rawContacts = JSON.parse(jsonText);

      if (!Array.isArray(rawContacts)) {
        throw new Error("Invalid data format: expected array of contacts");
      }

      const validatedContacts = importedContactsArraySchema.parse(rawContacts);

      const contactsToInsert = validatedContacts.map((contact) => ({
        name: contact.name,
        email: contact.email,
        source,
      }));

      await this.dependencies.contactRepository.createMany(contactsToInsert);

      try {
        await this.dependencies.storageRepository.deleteFile(fileName);
      } catch (delErr) {
        helpers.logger.error(`Cleanup failed for ${fileName}: ${delErr}`);
      }

      helpers.logger.info(`Successfully processed ${contactsToInsert.length} contacts for job ${jobId}`);
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
