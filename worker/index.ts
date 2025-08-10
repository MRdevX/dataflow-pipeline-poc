import { run } from "graphile-worker";
import processImportJob from "../tasks/import.js";

async function main() {
  const connectionString = process.env.DATABASE_URL!;

  const runner = await run({
    connectionString,
    concurrency: 5,
    noHandleSignals: false,
    pollInterval: 1000,
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
  process.exit(1);
});
