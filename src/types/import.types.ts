import type { ImportRequest, ImportResponse } from "../models/job.model.js";

export type UploadType = "json" | "file" | "stream";

export interface UploadRequest {
  jobId: string;
  source: string;
  content: Buffer | string;
  fileName: string;
  useResumable: boolean;
  contentType?: string;
  metadata?: Record<string, any>;
}

export interface UploadMetadata {
  jobId: string;
  source: string;
  uploadType: UploadType;
  originalName?: string;
  size?: number;
  timestamp?: string;
}

export interface HandlerSuccess {
  response: ImportResponse;
  status: 200;
}

export interface HandlerError {
  error: string;
  status: 400 | 500;
  issues?: any;
}

export type HandlerResult = HandlerSuccess | HandlerError;

export type ContentType = "multipart" | "json" | "stream";

export interface InputHandler {
  (c: any): Promise<HandlerResult>;
}

export class ImportError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ImportError";
  }
}
