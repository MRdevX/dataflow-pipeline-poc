import {
	CONTENT_TYPES,
	STORAGE_BUCKETS,
} from "../constants/storage.constants.js";
import { handleError } from "../utils/error-handler.js";
import { storage } from "../utils/storage.client.js";

export class StorageRepository {
	async uploadFile(fileName: string, data: string): Promise<void> {
		try {
			await storage.uploadFile(
				STORAGE_BUCKETS.IMPORTS,
				fileName,
				data,
				CONTENT_TYPES.JSON,
			);
		} catch (error) {
			throw handleError(error, "Failed to upload file");
		}
	}

	async downloadFile(fileName: string): Promise<string> {
		try {
			return await storage.downloadFile(STORAGE_BUCKETS.IMPORTS, fileName);
		} catch (error) {
			throw handleError(error, "Failed to download file");
		}
	}

	async deleteFile(fileName: string): Promise<void> {
		try {
			await storage.deleteFile(STORAGE_BUCKETS.IMPORTS, fileName);
		} catch (error) {
			throw handleError(error, "Failed to delete file");
		}
	}
}
