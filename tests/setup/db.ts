import { execSync } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

// Single Postgres 16 container shared across the integration project.
// MVP runs integration tests serially via `poolOptions.forks.singleFork`;
// per-worker schemas (testing.md §4.2) become a follow-up if parallelism
// becomes a wall-clock problem.
let container: StartedPostgreSqlContainer | undefined;

export default async function setup(project: TestProject) {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("kokan_test")
    .withUsername("kokan")
    .withPassword("kokan")
    .start();

  const databaseUrl = container.getConnectionUri();
  project.provide("DATABASE_URL", databaseUrl);

  // schema.prisma の directUrl が DATABASE_URL_UNPOOLED を要求するので
  // testcontainer URL を両方に注入する (ローカル PG には pooler が無いため
  // pooled / unpooled で同じ値で良い)。
  execSync("pnpm prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DATABASE_URL_UNPOOLED: databaseUrl,
    },
    stdio: "inherit",
  });

  return async () => {
    await container?.stop();
  };
}
