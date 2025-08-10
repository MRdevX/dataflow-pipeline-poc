import { WorkerPreset } from "graphile-worker";

const preset: GraphileConfig.Preset = {
  extends: [WorkerPreset],
  worker: {
    connectionString: process.env.DATABASE_URL,
    concurrentJobs: 5,
    fileExtensions: [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"],
    taskDirectory: "src/workers/tasks",
  },
};

export default preset;
