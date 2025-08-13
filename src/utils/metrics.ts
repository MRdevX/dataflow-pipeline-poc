import { Counter, Histogram } from "prom-client";
import { config } from "../config/index.js";

class MetricsService {
  private static instance: MetricsService | null = null;
  private metrics: ReturnType<typeof this.createMetrics> | null = null;

  private constructor() {
    this.metrics = config.metrics.enabled ? this.createMetrics() : null;
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  private createMetrics() {
    return {
      requests: {
        total: new Counter({
          name: "import_requests_total",
          help: "Total import requests",
          labelNames: ["method", "content_type", "source", "status"],
        }),
        duration: new Histogram({
          name: "import_requests_duration_seconds",
          help: "Request duration",
          labelNames: ["method", "content_type", "source"],
          buckets: [0.1, 0.5, 1, 2, 5, 10],
        }),
      },

      uploads: {
        total: new Counter({
          name: "upload_operations_total",
          help: "Total upload operations",
          labelNames: ["type", "bucket", "status"],
        }),
        duration: new Histogram({
          name: "upload_duration_seconds",
          help: "Upload duration",
          labelNames: ["type", "bucket"],
          buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
        }),
      },

      jobs: {
        processed: new Counter({
          name: "jobs_processed_total",
          help: "Total jobs processed",
          labelNames: ["status", "source"],
        }),
        failed: new Counter({
          name: "jobs_failed_total",
          help: "Total failed jobs",
          labelNames: ["error_type", "source"],
        }),
        duration: new Histogram({
          name: "job_processing_duration_seconds",
          help: "Job processing duration",
          labelNames: ["source"],
          buckets: [1, 5, 10, 30, 60, 120],
        }),
      },

      business: {
        contactsImported: new Counter({
          name: "contacts_imported_total",
          help: "Total contacts imported",
          labelNames: ["source"],
        }),
      },
    };
  }

  recordRequest(method: string, contentType: string, source: string, status: number, duration?: number) {
    if (!this.metrics) return;

    this.metrics.requests.total.inc({ method, content_type: contentType, source, status });
    if (duration) {
      this.metrics.requests.duration.observe({ method, content_type: contentType, source }, duration);
    }
  }

  recordUpload(type: string, bucket: string, status: string, duration?: number) {
    if (!this.metrics) return;

    this.metrics.uploads.total.inc({ type, bucket, status });
    if (duration) {
      this.metrics.uploads.duration.observe({ type, bucket }, duration);
    }
  }

  recordJob(source: string, status: "success" | "failed", duration?: number, errorType?: string) {
    if (!this.metrics) return;

    if (status === "success") {
      this.metrics.jobs.processed.inc({ status, source });
    } else {
      this.metrics.jobs.failed.inc({ error_type: errorType || "Unknown", source });
    }

    if (duration) {
      this.metrics.jobs.duration.observe({ source }, duration);
    }
  }

  recordContactsImported(source: string, count: number) {
    if (!this.metrics) return;
    this.metrics.business.contactsImported.inc({ source }, count);
  }
}

export const metrics = MetricsService.getInstance();
