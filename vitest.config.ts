import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/setup/db.ts"],
          setupFiles: ["tests/setup/db.per-test.ts"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          // Container holds shared state; serialize until per-worker schema
          // is wired (testing.md §4.2 follow-up).
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "cobertura"],
      include: ["lib/**", "app/_actions/**", "app/api/cron/**"],
      thresholds: {
        "lib/**": { lines: 80, branches: 75 },
        "app/_actions/**": { lines: 70, branches: 65 },
        "app/api/cron/**": { lines: 70, branches: 65 },
      },
    },
  },
});
