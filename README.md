# DataFlow Pipeline

A proof-of-concept data import pipeline demonstrating modern backend development practices with **Hono**, **Supabase**, and **Graphile Worker**.

## 🚀 Features

- **Multi-format Imports**: JSON, file uploads, and streaming data
- **Resumable Uploads**: TUS protocol for large files
- **Background Processing**: Async job processing with Graphile Worker
- **Comprehensive Validation**: Zod schema validation with detailed error reporting
- **Monitoring**: Prometheus metrics and health checks
- **Testing**: Unit, integration, and E2E test suites

## 🏗️ Architecture

```
API (Hono) → Storage (Supabase) → Worker (Graphile) → Database (PostgreSQL)
     ↓              ↓                    ↓
Validation    File Storage         Data Processing
   (Zod)      (Buckets)           (Contacts Table)
```

## 📋 API Reference

### `POST /import`

**JSON Payload:**

```json
{
  "source": "crm-tool-x",
  "data": [{ "name": "Alice", "email": "alice@example.com" }],
  "useResumable": false
}
```

**File Upload:** `multipart/form-data` with fields: `file`, `source`, `useResumable`

**Stream Upload:** Headers `X-Source`, `X-Use-Resumable` with raw data body

**Response:** `{ "jobId": "import-123" }`

### `GET /health` - Health check

### `GET /metrics` - Prometheus metrics

## 🛠️ Quick Start

```bash
pnpm install
pnpm run supabase:start
pnpm run graphile-worker:install
pnpm run dev
pnpm run e2e
```

## 🧪 Testing

```bash
pnpm test                    # All tests
pnpm run test:unit          # Unit tests
pnpm run test:integration   # Integration tests
pnpm run test:coverage      # With coverage
```

## 🔧 Configuration

| Variable                    | Description                 | Default  |
| --------------------------- | --------------------------- | -------- |
| `SUPABASE_URL`              | Supabase project URL        | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key            | Required |
| `DATABASE_URL`              | PostgreSQL connection       | Required |
| `ENABLE_METRICS`            | Prometheus metrics          | `true`   |
| `UPLOAD_CHUNK_SIZE`         | Resumable upload chunk size | `6MB`    |

## 📊 Database Schema

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  source TEXT,
  imported_at TIMESTAMP DEFAULT now()
);
```

## 🔄 Processing Pipeline

1. **Import Request** → Content type detection
2. **File Storage** → Supabase bucket upload
3. **Job Queue** → Graphile Worker job creation
4. **Background Processing** → Download, validate, insert
5. **Cleanup** → Automatic file deletion

**Worker Config:** 10 concurrent jobs, 500ms poll interval

## 🏆 Best Practices Demonstrated

### **Architecture**

- Separation of concerns (routes, services, repositories)
- Dependency injection patterns
- Repository and service layer patterns
- Type-safe configuration with Zod validation

### **Quality & Reliability**

- Comprehensive error handling with custom error classes
- Input validation with detailed error reporting
- Graceful shutdown and resource cleanup
- Health monitoring and structured logging

### **Development Experience**

- Hot reloading development server
- Comprehensive test coverage (unit, integration, E2E)
- Code formatting with Biome
- Conventional commits and changelog

## 📁 Project Structure

```
src/
├── app.ts              # Application setup
├── config/             # Configuration management
├── middleware/         # Hono middleware
├── models/             # Data models
├── repositories/       # Data access layer
├── routes/             # API handlers
├── services/           # Business logic
├── types/              # TypeScript types
├── utils/              # Utilities
├── validation/         # Schema validation
└── workers/            # Background processing
```

## ⚠️ Important Note

This is a **proof-of-concept demonstration** for learning purposes. Not intended for production use.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Add tests for new functionality
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

MIT License

---

Built with ❤️ using Hono, Supabase, and Graphile Worker
