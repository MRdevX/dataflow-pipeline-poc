# Quick Reference Guide

## System Overview

**Purpose**: Large-scale contact import pipeline with multiple upload methods and background processing.

**Tech Stack**: Hono + Supabase + Graphile Worker + TypeScript

## API Endpoints

### POST `/import`

Import contact data via multiple content types.

**Content Types:**

- `application/json` - Direct JSON payload
- `multipart/form-data` - File upload
- `application/octet-stream` - Raw data stream

**Headers for Stream Upload:**

- `X-Source` - Import source identifier
- `X-Use-Resumable` - Enable resumable upload (true/false)

**Response:**

```json
{
  "jobId": "1703123456789-abc123def"
}
```

### GET `/health`

System health check.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/metrics`

Prometheus metrics (when enabled).

## Data Models

### Contact

```typescript
interface Contact {
  id?: string; // UUID, auto-generated
  name: string; // Required, max 255 chars
  email: string; // Required, validated format
  source: string; // Required, import source
  imported_at?: string; // Timestamp, auto-generated
}
```

### Import Request

```typescript
interface ImportRequest {
  source: string; // Required, max 100 chars
  data: Record<string, unknown>[]; // Required, min 1 contact
  useResumable?: boolean; // Optional, default false
}
```

## Usage Examples

### JSON Import

```bash
curl -X POST http://localhost:3000/import \
  -H "Content-Type: application/json" \
  -d '{
    "source": "crm-tool-x",
    "data": [
      {"name": "Alice", "email": "alice@example.com"},
      {"name": "Bob", "email": "bob@example.com"}
    ],
    "useResumable": false
  }'
```

### File Upload

```bash
curl -X POST http://localhost:3000/import \
  -F "file=@contacts.json" \
  -F "source=crm-tool-x" \
  -F "useResumable=true"
```

### Stream Upload

```bash
curl -X POST http://localhost:3000/import \
  -H "Content-Type: application/octet-stream" \
  -H "X-Source: crm-tool-x" \
  -H "X-Use-Resumable: true" \
  --data-binary @contacts.json
```

## Key Components

### Services

- **ImportService** - Main business logic orchestrator
- **ResumableUploadService** - TUS protocol implementation
- **StorageRepository** - Supabase Storage operations
- **ContactRepository** - Database operations

### Workers

- **ImportTaskProcessor** - Background job processing
- **Graphile Worker** - Job queue management

### Routes

- **import.route.ts** - Import endpoint handlers
- **health.route.ts** - Health check endpoint

### Utils

- **import.utils.ts** - Content type detection and handler factory
- **postgrest.client.ts** - Database client
- **storage.client.ts** - Storage client
- **validation.schemas.ts** - Zod validation schemas

## Configuration

### Environment Variables

```bash
PORT=3000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
UPLOAD_CHUNK_SIZE=6291456
ENABLE_METRICS=true
```

### Worker Configuration

```typescript
{
  concurrency: 10,        // Concurrent jobs
  pollInterval: 500,      // Poll interval (ms)
}
```

### Upload Configuration

```typescript
{
  chunkSize: 6291456,     // 6MB chunks
  retryDelays: [0, 3000, 5000, 10000, 20000],
  cacheControl: "3600",   // 1 hour cache
}
```

## Development Commands

```bash
# Start development
pnpm run dev

# Start Supabase
pnpm run supabase:start

# Install worker schema
pnpm run graphile-worker:install

# Run worker
pnpm run worker

# Run tests
pnpm run test

# E2E testing
pnpm run e2e
```

## Error Handling

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

### Common Error Codes

- `INVALID_INPUT` - Unsupported input type
- `UPLOAD_FAILED` - Storage upload failure
- `IMPORT_FAILED` - General import failure
- `FILE_READ_ERROR` - File reading failure
- `STREAM_READ_ERROR` - Stream reading failure

## Performance Characteristics

- **Upload Throughput**: 5,003 contacts per import
- **Processing Speed**: ~1,000 contacts/second
- **Concurrent Jobs**: 10 worker instances
- **File Size Support**: Up to 100MB+ with resumable uploads
- **Memory Usage**: Efficient streaming for large files

## Testing

### Test Data

- **Small Dataset**: 10-50 contacts (unit tests)
- **Large Dataset**: 5,003 contacts (performance tests)
- **Invalid Data**: Malformed JSON, missing fields, invalid emails

### Test Coverage

- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete workflow testing

## Monitoring

### Health Checks

- Database connectivity
- Storage access
- Worker status

### Metrics

- Request counts
- Processing times
- Error rates
- Storage usage

### Logging

- Structured JSON logs
- Error context preservation
- Performance timing information

## Security

### Authentication

- Service role keys for Supabase
- Private storage bucket access
- API key management

### Validation

- Zod schema validation
- Input sanitization
- Error message sanitization

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
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false);
```

## File Structure

```
src/
├── app.ts                 # Main application setup
├── server.ts             # Server entry point
├── config/               # Configuration management
├── routes/               # API route handlers
├── services/             # Business logic services
├── workers/              # Background job processing
├── repositories/         # Data access layer
├── utils/                # Utility functions
├── validation/           # Schema validation
├── middleware/           # HTTP middleware
├── models/               # Data models
├── types/                # TypeScript types
└── constants/            # Application constants
```

## Best Practices

### Code Organization

- Service layer pattern for business logic
- Repository pattern for data access
- Dependency injection for testability
- Type guards for runtime type safety

### Error Handling

- Structured error responses
- Comprehensive error logging
- Graceful degradation
- Resource cleanup

### Performance

- Streaming for large files
- Batch database operations
- Background job processing
- Configurable chunk sizes

### Security

- Input validation with Zod
- Error message sanitization
- Secure authentication
- Private storage access

## Troubleshooting

### Common Issues

1. **Upload Fails**

   - Check Supabase service role key
   - Verify storage bucket exists
   - Check file size limits

2. **Worker Not Processing**

   - Verify Graphile Worker schema installed
   - Check database connectivity
   - Review worker logs

3. **Validation Errors**

   - Check JSON format
   - Verify required fields
   - Validate email formats

4. **Performance Issues**
   - Adjust chunk sizes
   - Increase worker concurrency
   - Monitor memory usage

### Debug Commands

```bash
# Check health
curl http://localhost:3000/health

# View metrics
curl http://localhost:3000/metrics

# Run worker in debug mode
DEBUG=* pnpm run worker

# Check Supabase status
pnpm run supabase:status
```
