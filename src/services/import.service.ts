import type { ImportRequest, ImportResponse } from "../models/job.model.js";
import { StorageRepository } from "../repositories/storage.repository.js";
import { addJob } from "../workers/worker-utils.js";
import { ResumableUploadService } from "./resumable-upload.service.js";
import { STORAGE_BUCKETS, CONTENT_TYPES } from "../constants/storage.constants.js";
import type { UploadRequest, UploadMetadata } from "../types/import.types.js";
import { ImportError } from "../types/import.types.js";
import { generateJobId } from "../utils/general.utils.js";
import { withUploadMetrics } from "../utils/service-metrics.js";

const storageRepository = new StorageRepository();
const resumableUploadService = new ResumableUploadService();

export class ImportService {
  private createMetadata(baseMetadata: Partial<UploadMetadata>): Record<string, any> {
    return {
      ...baseMetadata,
      timestamp: baseMetadata.timestamp || new Date().toISOString(),
    };
  }

  private async uploadAndQueue(request: UploadRequest): Promise<ImportResponse> {
    const { jobId, source, content, fileName, useResumable, contentType = CONTENT_TYPES.JSON, metadata = {} } = request;

    try {
      if (useResumable) {
        const uploadWithMetrics = withUploadMetrics(
          async () => {
            await resumableUploadService.uploadFile({
              bucketName: STORAGE_BUCKETS.IMPORTS,
              fileName,
              file: typeof content === "string" ? Buffer.from(content) : content,
              contentType,
              metadata: { ...metadata, jobId, source },
            });
          },
          "resumable",
          STORAGE_BUCKETS.IMPORTS
        );

        await uploadWithMetrics();
      } else {
        const uploadWithMetrics = withUploadMetrics(
          async () => {
            const data = typeof content === "string" ? content : content.toString("utf8");
            await storageRepository.uploadFile(fileName, data);
          },
          "direct",
          STORAGE_BUCKETS.IMPORTS
        );

        await uploadWithMetrics();
      }

      await addJob("processImportJob", { jobId, source, fileName });
      return { jobId };
    } catch (error) {
      throw new ImportError(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`, "UPLOAD_FAILED");
    }
  }

  async import(input: ImportRequest | File | ReadableStream, source: string, useResumable = false): Promise<ImportResponse> {
    const jobId = generateJobId();

    try {
      if (this.isImportRequest(input)) {
        return this.handleJsonImport(input, jobId, useResumable);
      }

      if (this.isFile(input)) {
        return this.handleFileImport(input, source, jobId, useResumable);
      }

      if (this.isReadableStream(input)) {
        return this.handleStreamImport(input, source, jobId, useResumable);
      }

      throw new ImportError("Unsupported input type", "INVALID_INPUT");
    } catch (error) {
      if (error instanceof ImportError) {
        throw error;
      }
      throw new ImportError(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`, "IMPORT_FAILED");
    }
  }

  async processImport(request: ImportRequest, useResumable = false): Promise<ImportResponse> {
    return this.import(request, request.source, useResumable);
  }

  async processFileUpload(file: File, source: string, useResumable = false): Promise<ImportResponse> {
    return this.import(file, source, useResumable);
  }

  async processStreamUpload(bodyStream: ReadableStream, source: string, useResumable = false): Promise<ImportResponse> {
    return this.import(bodyStream, source, useResumable);
  }

  private async handleJsonImport(request: ImportRequest, jobId: string, useResumable: boolean): Promise<ImportResponse> {
    const fileName = `import-${jobId}.json`;

    if (useResumable) {
      await resumableUploadService.uploadJsonData(fileName, request.data, {
        jobId,
        source: request.source,
      });
      await addJob("processImportJob", { jobId, source: request.source, fileName });
      return { jobId };
    }

    return this.uploadAndQueue({
      jobId,
      source: request.source,
      content: JSON.stringify(request.data),
      fileName,
      useResumable,
    });
  }

  private async handleFileImport(file: File, source: string, jobId: string, useResumable: boolean): Promise<ImportResponse> {
    const buffer = await this.fileToBuffer(file);
    const fileName = `import-${jobId}.json`;

    return this.uploadAndQueue({
      jobId,
      source,
      content: buffer,
      fileName,
      useResumable,
      contentType: file.type || "application/octet-stream",
      metadata: this.createMetadata({
        jobId,
        source,
        uploadType: "file",
        originalName: file.name,
        size: file.size,
      }),
    });
  }

  private async handleStreamImport(
    stream: ReadableStream,
    source: string,
    jobId: string,
    useResumable: boolean
  ): Promise<ImportResponse> {
    const buffer = await this.streamToBuffer(stream);
    const fileName = `import-${jobId}.json`;

    return this.uploadAndQueue({
      jobId,
      source,
      content: buffer,
      fileName,
      useResumable,
      metadata: this.createMetadata({
        jobId,
        source,
        uploadType: "stream",
        size: buffer.length,
      }),
    });
  }

  private isImportRequest(input: any): input is ImportRequest {
    return input && typeof input === "object" && "source" in input && "data" in input;
  }

  private isFile(input: any): input is File {
    return input instanceof File;
  }

  private isReadableStream(input: any): input is ReadableStream {
    return input && typeof input.getReader === "function";
  }

  private async fileToBuffer(file: File): Promise<Buffer> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new ImportError(
        `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
        "FILE_READ_ERROR"
      );
    }
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
    } catch (error) {
      throw new ImportError(
        `Failed to read stream: ${error instanceof Error ? error.message : "Unknown error"}`,
        "STREAM_READ_ERROR"
      );
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }
}
