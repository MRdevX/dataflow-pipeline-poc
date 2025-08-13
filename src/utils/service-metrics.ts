import { metrics } from "./metrics.js";

function withTiming<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  recordMetrics: (duration: number, status: string, ...args: T) => void
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    try {
      const result = await operation(...args);
      const duration = (Date.now() - startTime) / 1000;
      recordMetrics(duration, "success", ...args);
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      recordMetrics(duration, "failed", ...args);
      throw error;
    }
  };
}

export const withUploadMetrics = <T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  type: string,
  bucket: string
) => {
  return withTiming(operation, (duration: number, status: string, ...args: T) => {
    metrics.recordUpload(type, bucket, status, duration);
  });
};

export const withJobMetrics = <T extends any[], R>(operation: (...args: T) => Promise<R>, source: string) => {
  return withTiming(operation, (duration: number, status: string, ...args: T) => {
    if (status === "success") {
      metrics.recordJob(source, "success", duration);
    } else {
      metrics.recordJob(source, "failed", duration, "Unknown");
    }
  });
};
