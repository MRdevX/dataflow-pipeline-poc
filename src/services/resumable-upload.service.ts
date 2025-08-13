import * as tus from "tus-js-client";
import { config } from "../config/index.js";
import { CONTENT_TYPES, STORAGE_BUCKETS } from "../constants/storage.constants.js";

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
    return config.env === "development"
      ? `${config.supabase.url}/storage/v1/upload/resumable`
      : `https://${
          config.supabase.url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
        }.storage.supabase.co/storage/v1/upload/resumable`;
  }

  async uploadFile(options: ResumableUploadOptions): Promise<string> {
    const { fileName, file, contentType = config.upload.defaultContentType, metadata = {}, onProgress } = options;

    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: this.getTusEndpoint(),
        retryDelays: config.upload.retryDelays,
        headers: {
          authorization: `Bearer ${config.supabase.serviceRoleKey}`,
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: options.bucketName,
          objectName: fileName,
          contentType,
          cacheControl: config.upload.cacheControl,
          metadata: JSON.stringify(metadata),
        },

        chunkSize: config.upload.chunkSize,
        onError: (error: any) => {
          console.error(`Upload failed for ${fileName}:`, error);
          reject(error);
        },
        onProgress: (bytesUploaded: number, bytesTotal: number) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          console.log(`${fileName}: ${bytesUploaded}/${bytesTotal} bytes (${percentage}%)`);
          onProgress?.(bytesUploaded, bytesTotal);
        },
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
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void
  ): Promise<string> {
    return this.uploadFile({
      bucketName: STORAGE_BUCKETS.IMPORTS,
      fileName,
      file: Buffer.from(JSON.stringify(data), "utf-8"),
      contentType: CONTENT_TYPES.JSON,
      metadata,
      onProgress,
    });
  }
}
