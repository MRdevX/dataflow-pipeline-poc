import type { ImportRequest, ImportResponse } from "../models/job.model.js";
import { StorageRepository } from "../repositories/storage.repository.js";
import { ResumableUploadService } from "./resumable-upload.service.js";
import { addJob } from "../workers/worker-utils.js";

const storageRepository = new StorageRepository();
const resumableUploadService = new ResumableUploadService();

export class ImportService {
  async processImport(request: ImportRequest, useResumable = false): Promise<ImportResponse> {
    const jobId = Date.now().toString();
    const fileName = `import-${jobId}.json`;

    if (useResumable) {
      await resumableUploadService.uploadJsonData(fileName, request.data, {
        jobId,
        source: request.source,
      });
    } else {
      await storageRepository.uploadFile(fileName, JSON.stringify(request.data));
    }

    await addJob("processImportJob", {
      jobId,
      source: request.source,
    });

    return { jobId };
  }
}
