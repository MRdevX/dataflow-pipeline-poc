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

export const config: Config = {
  port: parseInt(process.env.PORT || "3000"),
  env: (process.env.NODE_ENV as "development" | "production") || "development",
  database: {
    url: process.env.DATABASE_URL || "",
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
  worker: {
    concurrency: 10,
    pollInterval: 500,
  },
  upload: {
    chunkSize: parseInt(process.env.UPLOAD_CHUNK_SIZE || "6291456"), // 6MB default
    retryDelays: [0, 3000, 5000, 10000, 20000],
    cacheControl: process.env.UPLOAD_CACHE_CONTROL || "3600",
    defaultContentType: process.env.UPLOAD_DEFAULT_CONTENT_TYPE || "application/octet-stream",
  },
};
