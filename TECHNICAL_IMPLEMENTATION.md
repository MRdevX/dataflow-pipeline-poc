# Technical Implementation Guide

## Core Implementation Patterns

### 1. Service Layer Architecture

The system follows a clean service layer pattern with clear separation of concerns:

```typescript
// ImportService: Main business logic orchestrator
export class ImportService {
  async import(input: ImportRequest | File | ReadableStream, source: string, useResumable = false): Promise<ImportResponse> {
    const jobId = generateJobId();

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
  }
}
```

**Key Design Decisions:**

- **Polymorphic Input Handling**: Single method accepts multiple input types
- **Type Guards**: Runtime type checking for safe processing
- **Error Classification**: Structured error types with codes
- **Job ID Generation**: Unique identifiers for tracking

### 2. Content Type Detection and Handler Factory

```typescript
// Dynamic handler creation based on content type
export function createHandler(contentType: ContentType): InputHandler {
  switch (contentType) {
    case "multipart":
      return async (c: any): Promise<HandlerResult> => {
        const { file, source, useResumable } = await extractFormData(c);
        const error = validateRequiredFields({ file, source }, ["file", "source"]);
        if (error) return { error, status: 400 };

        const response = await importService.processFileUpload(file, source, useResumable);
        return { response, status: 200 };
      };

    case "json":
      return async (c: any): Promise<HandlerResult> => {
        const body = await c.req.json();
        const validationResult = importRequestSchema.safeParse(body);
        if (!validationResult.success) {
          return {
            error: "Invalid JSON format",
            issues: validationResult.error.issues,
            status: 400,
          };
        }

        const response = await importService.processImport(validationResult.data, validationResult.data.useResumable);
        return { response, status: 200 };
      };

    case "stream":
      return async (c: any): Promise<HandlerResult> => {
        const { source, useResumable, body } = extractStreamHeaders(c);
        const error = validateRequiredFields({ source, body }, ["source", "body"]);
        if (error) return { error: `Missing required parameters for stream upload: ${error}`, status: 400 };

        const response = await importService.processStreamUpload(body, source, useResumable);
        return { response, status: 200 };
      };

    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}
```

**Implementation Benefits:**

- **Strategy Pattern**: Different handlers for different content types
- **Validation Integration**: Zod schema validation with detailed error reporting
- **Error Handling**: Consistent error response format
- **Extensibility**: Easy to add new content type handlers

### 3. Resumable Upload Implementation

```typescript
// TUS Protocol integration for resumable uploads
export class ResumableUploadService {
  async uploadFile(options: ResumableUploadOptions): Promise<string> {
    const { fileName, file, contentType, metadata = {}, onProgress } = options;

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
}
```

**Key Features:**

- **Automatic Resume**: Detects and resumes interrupted uploads
- **Progress Tracking**: Real-time upload progress monitoring
- **Chunked Upload**: Configurable chunk sizes for large files
- **Retry Logic**: Exponential backoff for network failures
- **Metadata Support**: Rich metadata for tracking and debugging

### 4. Worker Implementation with Graphile Worker

```typescript
// Background job processing with dependency injection
export class ImportTaskProcessor {
  constructor(private dependencies: ImportTaskDependencies) {}

  async processImportJob(payload: ImportJobPayload, helpers: ImportTaskHelpers): Promise<void> {
    const { jobId, source, fileName: providedFileName } = payload;
    const fileName = providedFileName || `import-${jobId}.json`;

    helpers.logger.info(`Processing import job ${jobId} from ${source} (file: ${fileName})`);

    try {
      // 1. Download file from storage
      const content = await this.dependencies.storageRepository.downloadFile(fileName);

      // 2. Parse and validate JSON content
      const rawContacts = await this.parseContent(content);
      if (!Array.isArray(rawContacts)) {
        throw new Error("Invalid data format: expected array of contacts");
      }

      // 3. Validate each contact with Zod schema
      const validatedContacts = importedContactsArraySchema.parse(rawContacts);

      // 4. Transform data for database insertion
      const contactsToInsert = validatedContacts.map((contact) => ({
        name: contact.name,
        email: contact.email,
        source,
      }));

      // 5. Batch insert into database
      await this.dependencies.contactRepository.createMany(contactsToInsert);

      // 6. Cleanup temporary file
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
}
```

**Worker Architecture Benefits:**

- **Dependency Injection**: Testable and modular design
- **Error Handling**: Comprehensive error logging and propagation
- **Data Validation**: Zod schema validation for data integrity
- **Resource Cleanup**: Automatic file cleanup after processing
- **Logging**: Structured logging for monitoring and debugging

### 5. Repository Pattern Implementation

```typescript
// Contact repository with PostgREST integration
export class ContactRepository {
  async createMany(contacts: ContactInput[]): Promise<Contact[]> {
    const contactsToInsert: Contact[] = contacts.map((contact) => ({
      ...contact,
      imported_at: new Date().toISOString(),
    }));

    try {
      return await postgrest.insert<Contact>("contacts", contactsToInsert);
    } catch (error) {
      throw handleError(error, "Failed to insert contacts");
    }
  }

  async findAll(limit = 100, offset = 0): Promise<Contact[]> {
    try {
      return await postgrest.select<Contact>("contacts", {
        limit,
        offset,
        orderBy: "imported_at.desc",
      });
    } catch (error) {
      throw handleError(error, "Failed to fetch contacts");
    }
  }
}

// Storage repository with Supabase Storage integration
export class StorageRepository {
  async uploadFile(fileName: string, data: string): Promise<void> {
    try {
      await storage.uploadFile(STORAGE_BUCKETS.IMPORTS, fileName, data, CONTENT_TYPES.JSON);
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
```

**Repository Pattern Benefits:**

- **Data Access Abstraction**: Clean separation from business logic
- **Error Handling**: Consistent error handling across data operations
- **Type Safety**: Full TypeScript support with generics
- **Testability**: Easy to mock for unit testing

### 6. HTTP Client Abstraction

```typescript
// Base HTTP client with common functionality
export abstract class BaseHttpClient {
  protected baseUrl: string;
  protected apiKey: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.apiKey = config.supabase.serviceRoleKey;
  }

  protected async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      apikey: this.apiKey,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const sanitizedError = errorText.length > 200 ? `${errorText.substring(0, 200)}...` : errorText;
      throw new Error(`${this.constructor.name} API error: ${response.status} ${response.statusText} - ${sanitizedError}`);
    }

    return response;
  }
}

// PostgREST client for database operations
export class PostgRESTClient extends BaseHttpClient {
  constructor() {
    super(`${config.supabase.url}/rest/v1`);
  }

  async insert<T>(table: string, data: T | T[]): Promise<T[]> {
    const endpoint = `/${table}`;
    const headers = {
      Prefer: POSTGREST_HEADERS.PREFER_REPRESENTATION,
    };

    const response = await this.makeRequest(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    return response.json();
  }

  async select<T>(table: string, options: PostgRESTSelectOptions = {}): Promise<T[]> {
    const { select, filters, limit, offset, orderBy } = options;
    const params = new URLSearchParams();

    if (select) params.append("select", select);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, value);
      });
    }
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    if (orderBy) params.append("order", orderBy);

    const queryString = params.toString();
    const endpoint = `/${table}${queryString ? `?${queryString}` : ""}`;

    const response = await this.makeRequest(endpoint, {
      method: "GET",
    });

    return response.json();
  }
}
```

**HTTP Client Benefits:**

- **Code Reuse**: Common functionality in base class
- **Error Sanitization**: Prevents sensitive data exposure
- **Type Safety**: Generic types for response handling
- **Authentication**: Centralized API key management

### 7. Validation Schema Implementation

```typescript
// Zod schema for contact validation
const contactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.email(),
});

const importedContactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.email(),
});

const importedContactsArraySchema = z.array(importedContactSchema).min(1);

export const importRequestSchema = z.object({
  source: z.string().min(1).max(100),
  data: z.array(contactSchema).min(1),
  useResumable: z.boolean().optional().default(false),
});
```

**Validation Benefits:**

- **Runtime Safety**: Type checking at runtime
- **Detailed Errors**: Specific error messages for validation failures
- **Schema Composition**: Reusable schema components
- **Type Inference**: Automatic TypeScript type generation
- **Contact Validation**: Separate schemas for import requests vs worker processing

### 8. Configuration Management

```typescript
// Environment configuration with validation
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SUPABASE_URL: z.url().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  UPLOAD_CHUNK_SIZE: z.coerce.number().int().positive().default(6291456),
  UPLOAD_CACHE_CONTROL: z.string().default("3600"),
  UPLOAD_DEFAULT_CONTENT_TYPE: z.string().default("application/octet-stream"),
  ENABLE_METRICS: z.coerce.boolean().default(true),
});

export const config: Config = {
  port: validatedEnv.PORT,
  env: validatedEnv.NODE_ENV || "development",
  database: {
    url: validatedEnv.DATABASE_URL,
  },
  supabase: {
    url: validatedEnv.SUPABASE_URL,
    serviceRoleKey: validatedEnv.SUPABASE_SERVICE_ROLE_KEY,
  },
  worker: {
    concurrency: 10,
    pollInterval: 500,
  },
  upload: {
    chunkSize: validatedEnv.UPLOAD_CHUNK_SIZE,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    cacheControl: validatedEnv.UPLOAD_CACHE_CONTROL,
    defaultContentType: validatedEnv.UPLOAD_DEFAULT_CONTENT_TYPE,
  },
  metrics: {
    enabled: validatedEnv.ENABLE_METRICS,
  },
};
```

**Configuration Benefits:**

- **Environment Validation**: Runtime validation of environment variables
- **Type Safety**: Strongly typed configuration object
- **Default Values**: Sensible defaults for optional settings
- **Error Messages**: Clear error messages for missing required values

### 9. Error Handling Strategy

```typescript
// Custom error types for different scenarios
export class ImportError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ImportError";
  }
}

// Centralized error handling
export function handleError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : "Unknown error";
  return new Error(`${context}: ${message}`);
}

// Error response format
export interface HandlerError {
  error: string;
  status: 400 | 500;
  issues?: any;
}
```

**Error Handling Benefits:**

- **Error Classification**: Different error types for different scenarios
- **Context Preservation**: Error context for debugging
- **Structured Responses**: Consistent error response format
- **Error Codes**: Machine-readable error codes for client handling

### 10. Testing Implementation

```typescript
// Unit test with dependency mocking
describe("ImportService", () => {
  let importService: ImportService;

  beforeEach(() => {
    vi.clearAllMocks();
    importService = new ImportService();
  });

  describe("JSON Import Request", () => {
    it("should process JSON import request successfully", async () => {
      const importRequest = {
        source: "Test Company",
        data: sampleContacts,
        useResumable: false,
      };

      const result = await importService.import(importRequest, "Test Company", false);
      expect(result).toHaveProperty("jobId");
    });
  });
});

// Integration test with real dependencies
describe("Import API", () => {
  it("should handle JSON import request", async () => {
    const response = await app.request("/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "test",
        data: [{ name: "Test", email: "test@example.com" }],
      }),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toHaveProperty("jobId");
  });
});
```

**Testing Benefits:**

- **Comprehensive Coverage**: Unit, integration, and E2E tests
- **Mocking Strategy**: Dependency mocking for isolated testing
- **Real Scenarios**: E2E tests with actual data processing
- **Performance Testing**: Large dataset processing validation

## Performance Optimizations

### 1. Streaming Data Processing

- **Memory Efficiency**: Stream processing for large files
- **Chunked Uploads**: Configurable chunk sizes for optimal performance
- **Batch Database Operations**: Bulk inserts for better throughput

### 2. Background Processing

- **Asynchronous Jobs**: Non-blocking import processing
- **Concurrent Workers**: Configurable worker concurrency
- **Job Queuing**: Reliable job scheduling with retry logic

### 3. Storage Optimization

- **Temporary Files**: Automatic cleanup after processing
- **Metadata Tracking**: Rich metadata for debugging and monitoring
- **Error Recovery**: Graceful handling of storage failures

## Security Implementation

### 1. Input Validation

- **Schema Validation**: Zod schemas for all inputs
- **Type Checking**: Runtime type validation
- **Sanitization**: Input sanitization and validation

### 2. Authentication

- **Service Role Keys**: Secure Supabase authentication
- **API Key Management**: Centralized API key handling
- **Access Control**: Private storage bucket access

### 3. Error Handling

- **Error Sanitization**: Limited error message exposure
- **Structured Errors**: Consistent error response format
- **Logging**: Secure error logging without sensitive data

## Monitoring and Observability

### 1. Health Checks

```typescript
// Comprehensive health check implementation
healthRouter.get("/", async (c) => {
  try {
    // Database connectivity check
    const response = await fetch(`${config.supabase.url}/rest/v1/`, {
      headers: {
        Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
        apikey: config.supabase.serviceRoleKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Database connection failed: ${response.status}`);
    }

    // Storage connectivity check
    const { error: storageError } = await supabase.storage.from("imports").list("", { limit: 1 });
    if (storageError) throw storageError;

    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});
```

### 2. Metrics Collection

```typescript
// Prometheus metrics integration
export function setupMetrics(app: Hono) {
  if (!config.metrics.enabled) {
    return;
  }

  const { printMetrics, registerMetrics } = prometheus();
  app.use("*", registerMetrics);
  app.get("/metrics", printMetrics);
}
```

### 3. Structured Logging

- **Context Preservation**: Rich logging context for debugging
- **Performance Tracking**: Timing information for optimization
- **Error Tracking**: Detailed error context and stack traces

This technical implementation demonstrates a production-ready system with robust error handling, comprehensive testing, and scalable architecture patterns suitable for handling large-scale data imports.
