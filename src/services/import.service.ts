import type { ImportRequest, ImportResponse } from "../models/job.model.js";
import { StorageRepository } from "../repositories/storage.repository.js";
import { addJob } from "../workers/worker-utils.js";

const storageRepository = new StorageRepository();

export class ImportService {
	async processImport(request: ImportRequest): Promise<ImportResponse> {
		const jobId = Date.now().toString();
		const fileName = `import-${jobId}.json`;

		await storageRepository.uploadFile(fileName, JSON.stringify(request.data));

		await addJob("processImportJob", {
			jobId,
			source: request.source,
		});

		return { jobId };
	}
}
