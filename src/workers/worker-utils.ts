import { makeWorkerUtils } from "graphile-worker";
import { config } from "../config/index.js";

export async function createWorkerUtils() {
	return await makeWorkerUtils({
		connectionString: config.database.url,
	});
}

export async function addJob(
	taskName: string,
	payload: Record<string, unknown>,
) {
	const workerUtils = await createWorkerUtils();
	return await workerUtils.addJob(taskName, payload);
}
