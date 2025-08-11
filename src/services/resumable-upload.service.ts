import * as tus from "tus-js-client";
import { config } from "../config/index.js";
import {
	CONTENT_TYPES,
	STORAGE_BUCKETS,
} from "../constants/storage.constants.js";

export interface ResumableUploadOptions {
	bucketName: string;
	fileName: string;
	file: File | Buffer;
	contentType?: string;
	metadata?: Record<string, any>;
	onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
}

export class ResumableUploadService {
	private getTusEndpoint(): string {
		if (config.env === "development") {
			return `${config.supabase.url}/storage/v1/upload/resumable`;
		}

		const projectId = config.supabase.url.match(
			/https:\/\/([^.]+)\.supabase\.co/,
		)?.[1];
		if (!projectId) {
			throw new Error("Invalid Supabase URL format for production environment");
		}

		return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
	}

	private createMetadata(
		bucketName: string,
		fileName: string,
		contentType: string,
		metadata: Record<string, any>,
	) {
		return {
			bucketName,
			objectName: fileName,
			contentType,
			cacheControl: config.upload.cacheControl,
			metadata: JSON.stringify(metadata),
		};
	}

	private createHeaders() {
		return {
			authorization: `Bearer ${config.supabase.serviceRoleKey}`,
			"x-upsert": "true",
		};
	}

	private handleProgress(
		fileName: string,
		onProgress?: (bytesUploaded: number, bytesTotal: number) => void,
	) {
		return (bytesUploaded: number, bytesTotal: number) => {
			const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
			console.log(
				`Upload progress for ${fileName}: ${bytesUploaded}/${bytesTotal} bytes (${percentage}%)`,
			);
			onProgress?.(bytesUploaded, bytesTotal);
		};
	}

	async uploadFile(options: ResumableUploadOptions): Promise<string> {
		const {
			bucketName,
			fileName,
			file,
			contentType = config.upload.defaultContentType,
			metadata = {},
			onProgress,
		} = options;

		return new Promise((resolve, reject) => {
			const upload = new tus.Upload(file, {
				endpoint: this.getTusEndpoint(),
				retryDelays: config.upload.retryDelays,
				headers: this.createHeaders(),
				uploadDataDuringCreation: true,
				removeFingerprintOnSuccess: true,
				metadata: this.createMetadata(
					bucketName,
					fileName,
					contentType,
					metadata,
				),
				chunkSize: config.upload.chunkSize,
				onError: (error: any) => {
					console.error(`Upload failed for ${fileName}:`, error);
					reject(error);
				},
				onProgress: this.handleProgress(fileName, onProgress),
				onSuccess: () => {
					console.log(`Upload completed: ${fileName}`);
					resolve(upload.url || fileName);
				},
			});

			this.startUpload(upload);
		});
	}

	private async startUpload(upload: tus.Upload): Promise<void> {
		try {
			const previousUploads = await upload.findPreviousUploads();
			if (previousUploads.length > 0) {
				console.log("Resuming from previous upload");
				upload.resumeFromPreviousUpload(previousUploads[0]);
			}
			upload.start();
		} catch (error) {
			console.error("Failed to start upload:", error);
			throw error;
		}
	}

	async uploadJsonData(
		fileName: string,
		data: any,
		metadata?: Record<string, any>,
	): Promise<string> {
		const buffer = Buffer.from(JSON.stringify(data), "utf-8");

		return this.uploadFile({
			bucketName: STORAGE_BUCKETS.IMPORTS,
			fileName,
			file: buffer,
			contentType: CONTENT_TYPES.JSON,
			metadata,
			onProgress: (bytesUploaded, bytesTotal) => {
				const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
				console.log(`JSON upload progress: ${percentage}%`);
			},
		});
	}
}
