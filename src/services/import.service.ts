import type { ImportRequest, ImportResponse } from "../models/job.model.js";
import { StorageRepository } from "../repositories/storage.repository.js";
import { addJob } from "../workers/worker-utils.js";
import { ResumableUploadService } from "./resumable-upload.service.js";
import { STORAGE_BUCKETS, CONTENT_TYPES } from "../constants/storage.constants.js";

const storageRepository = new StorageRepository();
const resumableUploadService = new ResumableUploadService();

interface UploadContext {
  jobId: string;
  source: string;
  fileName: string;
  useResumable: boolean;
  contentType?: string;
  metadata?: Record<string, any>;
}

export class ImportService {
  private generateJobId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async uploadContent(context: UploadContext, content: Buffer | string): Promise<void> {
    const { jobId, source, fileName, useResumable, contentType = CONTENT_TYPES.JSON, metadata = {} } = context;

    if (useResumable) {
      await resumableUploadService.uploadFile({
        bucketName: STORAGE_BUCKETS.IMPORTS,
        fileName,
        file: typeof content === "string" ? Buffer.from(content) : content,
        contentType,
        metadata: { ...metadata, jobId, source },
      });
    } else {
      const data = typeof content === "string" ? content : content.toString("utf8");
      await storageRepository.uploadFile(fileName, data);
    }
  }

  private async queueJob(jobId: string, source: string, fileName: string): Promise<void> {
    await addJob("processImportJob", { jobId, source, fileName });
  }

  private async processUpload(context: UploadContext, content: Buffer | string): Promise<ImportResponse> {
    await this.uploadContent(context, content);
    await this.queueJob(context.jobId, context.source, context.fileName);
    return { jobId: context.jobId };
  }

  async processImport(request: ImportRequest, useResumable = false): Promise<ImportResponse> {
    const jobId = this.generateJobId();
    const context: UploadContext = {
      jobId,
      source: request.source,
      fileName: `import-${jobId}.json`,
      useResumable,
    };

    if (useResumable) {
      await resumableUploadService.uploadJsonData(context.fileName, request.data, {
        jobId,
        source: request.source,
      });
    } else {
      await this.uploadContent(context, JSON.stringify(request.data));
    }

    await this.queueJob(jobId, request.source, context.fileName);
    return { jobId };
  }

  async processFileUpload(file: File, source: string, useResumable = false): Promise<ImportResponse> {
    const jobId = this.generateJobId();
    const buffer = await this.fileToBuffer(file);

    const context: UploadContext = {
      jobId,
      source,
      fileName: `import-${jobId}-${file.name}`,
      useResumable,
      contentType: file.type || "application/octet-stream",
      metadata: {
        originalName: file.name,
        size: file.size,
        uploadType: "file",
      },
    };

    return this.processUpload(context, buffer);
  }

  async processStreamUpload(bodyStream: ReadableStream, source: string, useResumable = false): Promise<ImportResponse> {
    const jobId = this.generateJobId();
    const buffer = await this.streamToBuffer(bodyStream);

    const context: UploadContext = {
      jobId,
      source,
      fileName: `import-${jobId}-stream.json`,
      useResumable,
      metadata: {
        size: buffer.length,
        uploadType: "stream",
        timestamp: new Date().toISOString(),
      },
    };

    return this.processUpload(context, buffer);
  }

  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }
}
