export interface Config {
  port: number;
  env: "development" | "production";
  database: {
    url: string;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  worker: {
    concurrency: number;
    pollInterval: number;
  };
  upload: {
    chunkSize: number;
    retryDelays: number[];
    cacheControl: string;
    defaultContentType: string;
  };
}
