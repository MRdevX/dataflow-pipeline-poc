# Take-Home Backend: Architecture Documentation

## Overview

This is a robust import pipeline backend system built with **Hono** (TypeScript web framework), **Supabase** (database and storage), and **Graphile Worker** (background job processing). The system is designed to handle large-scale data imports with support for multiple upload methods, resumable uploads, and efficient background processing.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   API Gateway   │    │   Background    │
│                 │    │   (Hono)        │    │   Workers       │
│ - Web Apps      │───▶│ - /import       │───▶│ - Graphile      │
│ - Mobile Apps   │    │ - /health       │    │ - Import Tasks  │
│ - CLI Tools     │    │ - /metrics      │    │ - Import Tasks  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Supabase      │    │   Supabase      │
                       │   Storage       │    │   Database      │
                       │ - imports/      │    │ - contacts      │
                       │ - TUS Protocol  │    │ - jobs          │
                       └─────────────────┘    └─────────────────┘
```

## Core Technologies

- **Hono 4.9.0**: Fast, lightweight web framework for TypeScript
- **Supabase 2.54.0**: PostgreSQL database with real-time features and object storage
- **Graphile Worker 0.16.6**: Reliable background job processing
- **TUS Protocol**: Resumable file uploads via `tus-js-client`
- **Zod**: Runtime type validation and schema definition
- **Vitest**: Unit and integration testing framework

## Key Features

### 1. Multi-Format Import Support

- **JSON Payload**: Direct JSON data submission
- **Multipart File Upload**: File upload via form data
- **Stream Upload**: Raw data stream processing
- **Resumable Uploads**: TUS protocol for large file uploads with resume capability

### 2. Scalable Data Processing

- **Large Dataset Support**: Tested with 5,003 contacts per import
- **Background Processing**: Asynchronous job processing via Graphile Worker
- **Chunked Uploads**: Configurable chunk sizes for large files
- **Error Recovery**: Automatic retry mechanisms and error handling

### 3. Production-Ready Features

- **Health Monitoring**: `/health` endpoint with database and storage checks
- **Metrics**: Prometheus metrics integration
- **Validation**: Comprehensive data validation with Zod schemas
- **Error Handling**: Structured error responses and logging
- **Testing**: Comprehensive unit and integration test coverage

## API Endpoints

### POST `/import`

Handles contact data imports with multiple content types:

#### Content Types Supported:

1. **`application/json`**: Direct JSON payload
2. **`multipart/form-data`**: File upload with metadata
3. **`application/octet-stream`**: Raw data stream

#### Request Examples:

**JSON Import:**

```json
{
  "source": "crm-tool-x",
  "data": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ],
  "useResumable": false
}
```

**Multipart Upload:**

```bash
curl -X POST /import \
  -F "file=@contacts.json" \
  -F "source=crm-tool-x" \
  -F "useResumable=true"
```

**Stream Upload:**

```bash
curl -X POST /import \
  -H "Content-Type: application/octet-stream" \
  -H "X-Source: crm-tool-x" \
  -H "X-Use-Resumable: true" \
  --data-binary @contacts.json
```

#### Response:

```json
{
  "jobId": "1703123456789-abc123def"
}
```

### GET `/health`

System health check endpoint:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/metrics`

Prometheus metrics endpoint (when enabled):

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",path="/import"} 42
```

## Import Pipeline Architecture

### 1. Request Processing Flow

```
Client Request
     │
     ▼
┌─────────────────┐
│ Content Type    │ ──▶ Detect upload type
│ Detection       │     (JSON/Multipart/Stream)
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Input Handler   │ ──▶ Route to appropriate handler
│ Factory         │     based on content type
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Import Service  │ ──▶ Core business logic
│                 │     - Generate job ID
│                 │     - Upload to storage
│                 │     - Queue worker job
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Storage Layer   │ ──▶ Supabase Storage
│                 │     - Standard upload
│                 │     - TUS resumable upload
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Worker Queue    │ ──▶ Graphile Worker
│                 │     - Job scheduling
│                 │     - Retry logic
└─────────────────┘
```

### 2. Storage Strategy

**Standard Upload:**

- Direct upload to Supabase Storage
- Suitable for smaller files (< 6MB)
- Immediate processing

**Resumable Upload (TUS):**

- Chunked upload with resume capability
- Configurable chunk size (default: 6MB)
- Automatic retry on network failures
- Progress tracking and monitoring

### 3. Worker Processing

**Job Structure:**

```typescript
interface ImportJobPayload {
  jobId: string;
  source: string;
  fileName?: string;
}
```

**Processing Steps:**

1. **Download**: Retrieve file from Supabase Storage
2. **Parse**: Parse JSON content and validate structure
3. **Validate**: Zod schema validation for each contact
4. **Transform**: Add metadata (source, timestamp)
5. **Insert**: Batch insert into PostgreSQL via PostgREST
6. **Cleanup**: Remove temporary storage file

## Data Models

### Contact Model

```typescript
interface Contact {
  id?: string; // UUID, auto-generated
  name: string; // Required, max 255 chars
  email: string; // Required, validated format
  source: string; // Required, import source identifier
  imported_at?: string; // Timestamp, auto-generated
}
```

### Import Request Model

```typescript
interface ImportRequest {
  source: string; // Required, max 100 chars
  data: Record<string, unknown>[]; // Required, min 1 contact
  useResumable?: boolean; // Optional, default false
}
```

### Job Model

```typescript
interface ImportResponse {
  jobId: string; // Unique job identifier
}
```

## Database Schema

### Contacts Table

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  imported_at TIMESTAMP DEFAULT now()
);
```

### Storage Bucket

```sql
-- Supabase Storage bucket for import files
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false);
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Upload Configuration
UPLOAD_CHUNK_SIZE=6291456        # 6MB chunks
UPLOAD_CACHE_CONTROL=3600        # 1 hour cache
UPLOAD_DEFAULT_CONTENT_TYPE=application/octet-stream

# Worker Configuration
WORKER_CONCURRENCY=10            # Concurrent jobs
WORKER_POLL_INTERVAL=500         # 500ms poll interval

# Monitoring
ENABLE_METRICS=true
```

### Upload Configuration

```typescript
const uploadConfig = {
  chunkSize: 6 * 1024 * 1024, // 6MB chunks
  retryDelays: [0, 3000, 5000, 10000, 20000], // Exponential backoff
  cacheControl: "3600", // 1 hour cache
  defaultContentType: "application/octet-stream",
};
```

## Error Handling

### Error Types

1. **Validation Errors**: Invalid data format or missing fields
2. **Upload Errors**: Storage upload failures
3. **Processing Errors**: Worker processing failures
4. **System Errors**: Database or infrastructure issues

### Error Response Format

```json
{
  "error": "Descriptive error message",
  "issues": [
    {
      "path": ["data", 0, "email"],
      "message": "Invalid email format"
    }
  ],
  "status": 400
}
```

## Testing Strategy

### Test Coverage

- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete workflow testing
- **Performance Tests**: Large dataset processing

### Test Data

- **Small Dataset**: 10-50 contacts for unit tests
- **Large Dataset**: 5,003 contacts for performance tests
- **Invalid Data**: Malformed JSON, missing fields, invalid emails

### E2E Test Flow

1. **Environment Setup**: Supabase and API server validation
2. **Upload Testing**: All three upload methods with large datasets
3. **Resumable Testing**: Network interruption and resume scenarios
4. **Worker Processing**: Background job execution and verification
5. **Validation Testing**: Error handling and edge cases
6. **Cleanup**: System state verification

## Performance Characteristics

### Scalability Metrics

- **Upload Throughput**: 5,003 contacts per import
- **Processing Speed**: ~1,000 contacts/second
- **Concurrent Jobs**: 10 worker instances
- **File Size Support**: Up to 100MB+ with resumable uploads

### Resource Usage

- **Memory**: Efficient streaming for large files
- **CPU**: Background processing with configurable concurrency
- **Storage**: Temporary file cleanup after processing
- **Network**: Chunked uploads with retry logic

## Security Considerations

### Data Protection

- **Service Role Keys**: Secure Supabase authentication
- **Private Storage**: Non-public bucket access
- **Input Validation**: Comprehensive data sanitization
- **Error Sanitization**: Limited error message exposure

### Access Control

- **API Keys**: Required for all operations
- **Storage Permissions**: Private bucket with service role access
- **Database Access**: PostgREST with row-level security

## Monitoring and Observability

### Health Checks

- **Database Connectivity**: PostgREST endpoint validation
- **Storage Access**: Bucket listing capability
- **Worker Status**: Job queue health monitoring

### Metrics Collection

- **Request Counts**: HTTP endpoint usage
- **Processing Times**: Import job duration
- **Error Rates**: Failed imports and processing errors
- **Storage Usage**: File upload/download statistics

### Logging

- **Structured Logs**: JSON format for easy parsing
- **Error Tracking**: Detailed error context and stack traces
- **Performance Logs**: Timing information for optimization

## Deployment Considerations

### Production Setup

1. **Environment Configuration**: Secure environment variables
2. **Database Migration**: Automated schema updates
3. **Worker Deployment**: Separate worker processes
4. **Monitoring Setup**: Prometheus and Grafana integration
5. **Backup Strategy**: Database and storage backups

### Scaling Strategy

- **Horizontal Scaling**: Multiple API instances
- **Worker Scaling**: Configurable worker concurrency
- **Storage Scaling**: Supabase auto-scaling
- **Database Scaling**: Connection pooling and optimization

## Development Workflow

### Local Development

```bash
# Start Supabase
pnpm run supabase:start

# Install worker schema
pnpm run graphile-worker:install

# Start API server
pnpm run dev

# Run tests
pnpm run test

# E2E testing
pnpm run e2e
```

### Code Quality

- **TypeScript**: Strict type checking
- **Biome**: Code formatting and linting
- **Vitest**: Comprehensive testing
- **Coverage**: 90%+ test coverage target

## Future Enhancements

### Potential Improvements

1. **Real-time Progress**: WebSocket progress updates
2. **Batch Processing**: Configurable batch sizes
3. **Data Transformation**: Custom field mapping
4. **Duplicate Detection**: Email deduplication logic
5. **Export Functionality**: Data export capabilities
6. **API Rate Limiting**: Request throttling
7. **Caching Layer**: Redis for performance optimization

### Architecture Evolution

- **Microservices**: Service decomposition
- **Event Sourcing**: Event-driven architecture
- **CQRS**: Command-Query Responsibility Segregation
- **API Gateway**: Centralized API management

## Conclusion

This import pipeline system demonstrates a production-ready architecture capable of handling large-scale data imports with reliability, scalability, and maintainability. The combination of Hono, Supabase, and Graphile Worker provides a robust foundation for building data processing applications with modern best practices.
