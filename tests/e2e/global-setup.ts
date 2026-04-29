import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

// Playwright の `webServer` を使わない方針。webServer は globalSetup と並走
// するため env 注入のタイミングを合わせるのが難しく、サイレント失敗もしや
// すい。代わりにこの globalSetup の中で:
//   1) Postgres コンテナを起動
//   2) prisma migrate deploy
//   3) pnpm build (env 注入したサブプロセスで await 完了)
//   4) next start を spawn (バックグラウンド)
//   5) http://localhost:3100 が ready になるまで polling
// を直列に行う。teardown で next start を kill してから container を stop する。

const E2E_PORT = 3100;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

let container: StartedPostgreSqlContainer | undefined;
let serverProcess: ChildProcess | undefined;

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      // どんな HTTP ステータスでも応答さえ返れば listen 中とみなす。
      if (res.status >= 100 && res.status < 600) return;
    } catch {
      // ECONNREFUSED など。500ms 待って再試行。
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not respond at ${url} within ${timeoutMs}ms`);
}

export default async function globalSetup() {
  console.log("[e2e] starting Postgres container");
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("kokan_e2e")
    .withUsername("kokan")
    .withPassword("kokan")
    .start();

  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;
  process.env.AUTH_SECRET =
    process.env.AUTH_SECRET ?? "e2e-test-secret-do-not-use-in-prod=";
  process.env.AUTH_URL = E2E_BASE_URL;

  // テストファイル (e.g. helpers/db.ts) が PrismaClient を生成する際の参照点。
  const statePath = join(process.cwd(), ".playwright-state.json");
  writeFileSync(statePath, JSON.stringify({ databaseUrl }, null, 2), "utf8");

  console.log("[e2e] running prisma migrate deploy");
  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  // build と start で共有する env。.env.local の dev DB URL を上書きしたい
  // ので明示的に DATABASE_URL を渡す。
  const childEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: E2E_BASE_URL,
    AUTH_TRUST_HOST: "true",
    RESEND_API_KEY: "",
    EMAIL_FROM: "kokan-nikki <noreply@e2e.local>",
    NUDGE_THRESHOLD_HOURS: "72",
    CRON_SECRET: "e2e-cron-secret",
    PORT: String(E2E_PORT),
  };

  console.log("[e2e] running pnpm build");
  execSync("pnpm build", { env: childEnv, stdio: "inherit" });

  console.log(`[e2e] starting next start on :${E2E_PORT}`);
  serverProcess = spawn("pnpm", ["exec", "next", "start"], {
    env: childEnv,
    stdio: "inherit",
    detached: false,
  });
  serverProcess.on("error", (err) => {
    console.error("[e2e] next start spawn error:", err);
  });

  await waitForUrl(E2E_BASE_URL, 60_000);
  console.log("[e2e] server is up");

  return async () => {
    console.log("[e2e] tearing down");
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
      // SIGTERM で落ちなければ SIGKILL でとどめ。
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          serverProcess?.kill("SIGKILL");
          resolve(undefined);
        }, 5_000);
        serverProcess?.on("exit", () => {
          clearTimeout(timer);
          resolve(undefined);
        });
      });
    }
    await container?.stop();
  };
}
