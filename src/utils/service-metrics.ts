import { metrics } from "./metrics.js";

function withTiming<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  recordMetrics: (duration: number, ...args: T) => void
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    try {
      const result = await operation(...args);
      const duration = (Date.now() - startTime) / 1000;
      recordMetrics(duration, ...args);
      return result;
    } catch (error) {
      throw error;
    }
  };
}

export const withUploadMetrics = <T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  type: string,
  bucket: string
) => {
  return withTiming(operation, (duration: number, ...args: T) => {
    metrics.recordUpload(type, bucket, "success", duration);
  });
};

export const withJobMetrics = <T extends any[], R>(operation: (...args: T) => Promise<R>, source: string) => {
  return withTiming(operation, (duration: number, ...args: T) => {
    metrics.recordJob(source, "success", duration);
  });
};
