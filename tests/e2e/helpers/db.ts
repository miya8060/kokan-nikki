import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

// E2E テストファイル専用の PrismaClient ヘルパ。global-setup.ts が
// `.playwright-state.json` に DATABASE_URL を書き出すので、それを読んで接続する。
// process.env.DATABASE_URL も同時に設定されているはずだが、テストファイルの
// import 順によっては undefined のことがあるためファイルを source of truth に。

let cached: PrismaClient | undefined;

function readDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  const statePath = join(process.cwd(), ".playwright-state.json");
  const raw = readFileSync(statePath, "utf8");
  const parsed = JSON.parse(raw) as { databaseUrl?: string };
  if (!parsed.databaseUrl) {
    throw new Error("DATABASE_URL が解決できない: global-setup.ts は走った?");
  }
  return parsed.databaseUrl;
}

export function getE2EPrisma(): PrismaClient {
  if (!cached) {
    cached = new PrismaClient({
      datasources: { db: { url: readDatabaseUrl() } },
      log: ["error"],
    });
  }
  return cached;
}

// 各テストの先頭で呼ぶ。tests/setup/db.per-test.ts と同じ順序で truncate する
// (FK cascade を避けるため子テーブル → 親テーブルの順)。
export async function truncateAll(): Promise<void> {
  const prisma = getE2EPrisma();
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
       "Nudge",
       "Invite",
       "Entry",
       "NotebookMember",
       "Notebook",
       "Session",
       "Account",
       "VerificationToken",
       "User"
     RESTART IDENTITY CASCADE`,
  );
}
