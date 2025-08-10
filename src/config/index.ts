import { z } from "zod";
import "dotenv/config";
import type { Config } from "./types";

const envSchema = z.object({
	PORT: z.coerce.number().int().positive().default(3000),
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	SUPABASE_URL: z.url().min(1, "SUPABASE_URL is required"),
	SUPABASE_SERVICE_ROLE_KEY: z
		.string()
		.min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
	UPLOAD_CHUNK_SIZE: z.coerce.number().int().positive().default(6291456),
	UPLOAD_CACHE_CONTROL: z.string().default("3600"),
	UPLOAD_DEFAULT_CONTENT_TYPE: z.string().default("application/octet-stream"),
});

const envParseResult = envSchema.safeParse(process.env);

if (!envParseResult.success) {
	const errorMessage = envParseResult.error.issues
		.map((err) => `${err.path.join(".")}: ${err.message}`)
		.join(", ");
	throw new Error(`Environment validation error: ${errorMessage}`);
}

const validatedEnv = envParseResult.data;

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
};

export type { Config } from "./types";
