import type { Task } from "graphile-worker";
import { ContactRepository } from "../../repositories/contact.repository.js";
import { StorageRepository } from "../../repositories/storage.repository.js";
import { z } from "zod";

export interface ImportJobPayload {
  jobId: string;
  source: string;
  fileName?: string;
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

  private async parseContent(content: string): Promise<any[]> {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return parsed.data;
    }

    throw new Error("Invalid JSON format: expected array of contacts or import request structure");
  }

  async processImportJob(payload: ImportJobPayload, helpers: ImportTaskHelpers): Promise<void> {
    const { jobId, source, fileName: providedFileName } = payload;
    const fileName = providedFileName || `import-${jobId}.json`;

    helpers.logger.info(`Processing import job ${jobId} from ${source} (file: ${fileName})`);

    try {
      const content = await this.dependencies.storageRepository.downloadFile(fileName);
      const rawContacts = await this.parseContent(content);

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
        helpers.logger.info(`Cleaned up file: ${fileName}`);
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
