import { defineConfig, devices } from "@playwright/test";

// MVP scope (testing.md §4.3): Chromium のみ。Playwright の `webServer` 機能は
// 使わず、tests/e2e/global-setup.ts の中で Postgres コンテナ起動 → migrate →
// build → next start spawn → polling 待ち、を直列に行う。webServer と
// globalSetup の並走による env race を避けるための割り切り。
//
// Resend: e2e-01〜03 はメール経路を踏まないため MSW は未配線。RESEND_API_KEY
// を空にして lib/mailer.ts の dev fallback (tmp/dev-mailbox) に倒し、誤って
// 本番 API に触らないだけ確保する。今後の email 系シナリオで必要になったら
// instrumentation.ts + msw/node を NODE_OPTIONS=--require 経由で挿す。

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  globalSetup: "./tests/e2e/global-setup.ts",

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
