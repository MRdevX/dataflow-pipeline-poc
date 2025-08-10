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

	process.on("SIGINT", async () => {
		await runner.stop();
		process.exit(0);
	});
}

main().catch((error) => {
	console.error("Worker failed to start:", error);
	process.exit(1);
});
