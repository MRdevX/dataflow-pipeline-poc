import { run } from "graphile-worker";
import { config } from "../config/index.js";
import processImportJob from "./tasks/import.task.js";

async function main() {
	const runner = await run({
		connectionString: config.database.url,
		concurrency: config.worker.concurrency,
		noHandleSignals: false,
		pollInterval: config.worker.pollInterval,
		taskList: {
			processImportJob,
		},
	});

	const gracefulShutdown = async (signal: string) => {
		console.log(`\n[Worker] Received ${signal}. Shutting down...`);
		await runner.stop();
		process.exit(0);
	};

	process.on("SIGINT", () => gracefulShutdown("SIGINT"));
	process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

	console.log(
		`[Worker] Started with concurrency: ${config.worker.concurrency}`,
	);
}

main().catch((error) => {
	console.error("[Worker] Failed to start:", error);
	process.exit(1);
});
