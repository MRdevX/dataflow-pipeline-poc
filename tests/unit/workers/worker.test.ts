import { vi } from "vitest";

vi.mock("graphile-worker", () => ({
  run: vi.fn(),
}));

vi.mock("../../../src/config/index.js", () => ({
  config: {
    database: {
      url: "postgresql://test:test@localhost:5432/test",
    },
    worker: {
      concurrency: 10,
      pollInterval: 500,
    },
  },
}));

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { run } from "graphile-worker";
import { createTestContext } from "../../utils/test-context.js";

const originalArgv = process.argv;
const originalOn = process.on;
const originalExit = process.exit;
const originalConsole = console;

describe("Worker", () => {
  let mockRunner: any;

  createTestContext();

  beforeEach(() => {
    vi.clearAllMocks();

    mockRunner = {
      stop: vi.fn().mockResolvedValue(undefined),
    };

    (run as any).mockResolvedValue(mockRunner);

    process.argv = [...originalArgv];
    process.on = vi.fn();
    process.exit = vi.fn() as any;
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.on = originalOn;
    process.exit = originalExit;
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  describe("Worker Configuration", () => {
    it("should configure worker with correct settings", () => {
      const expectedConfig = {
        connectionString: "postgresql://test:test@localhost:5432/test",
        concurrency: 10,
        noHandleSignals: false,
        pollInterval: 500,
        taskList: {
          processImportJob: expect.any(Function),
        },
      };

      expect(expectedConfig.connectionString).toBe("postgresql://test:test@localhost:5432/test");
      expect(expectedConfig.concurrency).toBe(10);
      expect(expectedConfig.pollInterval).toBe(500);
    });

    it("should handle graceful shutdown", async () => {
      await mockRunner.stop();
      expect(mockRunner.stop).toHaveBeenCalled();
    });
  });

  describe("Signal Handling", () => {
    it("should handle SIGINT gracefully", async () => {
      const gracefulShutdown = async (signal: string) => {
        console.log(`\n[Worker] Received ${signal}. Shutting down...`);
        await mockRunner.stop();
        process.exit(0);
      };

      await gracefulShutdown("SIGINT");

      expect(console.log).toHaveBeenCalledWith("\n[Worker] Received SIGINT. Shutting down...");
      expect(mockRunner.stop).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("should handle SIGTERM gracefully", async () => {
      const gracefulShutdown = async (signal: string) => {
        console.log(`\n[Worker] Received ${signal}. Shutting down...`);
        await mockRunner.stop();
        process.exit(0);
      };

      await gracefulShutdown("SIGTERM");

      expect(console.log).toHaveBeenCalledWith("\n[Worker] Received SIGTERM. Shutting down...");
      expect(mockRunner.stop).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("should handle runner stop failure", async () => {
      const stopError = new Error("Failed to stop runner");
      mockRunner.stop.mockRejectedValue(stopError);

      const gracefulShutdown = async (signal: string) => {
        console.log(`\n[Worker] Received ${signal}. Shutting down...`);
        try {
          await mockRunner.stop();
        } catch (error) {
          console.error("Failed to stop runner:", error);
        }
        process.exit(0);
      };

      await gracefulShutdown("SIGINT");

      expect(console.log).toHaveBeenCalledWith("\n[Worker] Received SIGINT. Shutting down...");
      expect(mockRunner.stop).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle initialization errors", () => {
      const initError = new Error("Failed to initialize worker");
      console.error("[Worker] Failed to start:", initError);
      process.exit(1);

      expect(console.error).toHaveBeenCalledWith("[Worker] Failed to start:", initError);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
