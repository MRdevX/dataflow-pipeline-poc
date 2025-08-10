import { serve } from "@hono/node-server";
import app from "./app.js";
import { config } from "./config/index.js";

const port = config.port;

console.log(`Server starting on port ${port}`);

serve({
	fetch: app.fetch,
	port,
});

console.log(`Server is running on port ${port}`);
