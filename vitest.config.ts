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
          server: {
            deps: {
              // next-auth ships an ESM bundle that imports "next/server"
              // without a file extension; Node's resolver doesn't follow
              // Next's package.json#exports through nested deps, so vitest
              // raises ERR_MODULE_NOT_FOUND. Inlining lets Vite resolve the
              // sub-path export the way the Next.js runtime does.
              inline: ["next-auth", "@auth/core"],
            },
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "cobertura"],
      include: ["lib/**", "app/_actions/**", "app/api/cron/**"],
      // 純関数 utility で integration test が import 経路を持たないものは
      // unit project の方で 100% カバーしている前提で除外する。
      // (in-app-browser.ts は signin page の server component からだけ呼ばれるが、
      //  signin page 自体に integration test が無いため integration run では 0%
      //  扱いになり、lib/** branches threshold を引きずり下ろしてしまう)
      exclude: ["lib/in-app-browser.ts"],
      thresholds: {
        "lib/**": { lines: 80, branches: 75 },
        "app/_actions/**": { lines: 70, branches: 65 },
        "app/api/cron/**": { lines: 70, branches: 65 },
      },
    },
  },
});
