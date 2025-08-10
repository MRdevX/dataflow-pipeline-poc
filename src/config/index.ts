export interface Config {
	port: number;
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
}

export const config: Config = {
	port: parseInt(process.env.PORT || "3000"),
	database: {
		url: process.env.DATABASE_URL || "",
	},
	supabase: {
		url: process.env.SUPABASE_URL || "",
		serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
	},
	worker: {
		concurrency: 5,
		pollInterval: 1000,
	},
};
