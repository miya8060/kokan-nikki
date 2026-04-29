import { randomBytes } from "node:crypto";

import type { BrowserContext } from "@playwright/test";
import type { User } from "@prisma/client";

import { getE2EPrisma } from "@/tests/e2e/helpers/db";

// マジックリンクの emit/verify は結合テスト側で検証済 (testing.md §5)。
// E2E では User と Session を直接 INSERT して、Auth.js v5 の database session
// クッキー (`authjs.session-token`) を Playwright の context に注入することで
// サインイン状態を作る。
//
// Auth.js v5 のクッキー命名規則:
//   - http  : `authjs.session-token`
//   - https : `__Secure-authjs.session-token`
// E2E は http://localhost:3100 で立てているので前者でよい。

const AUTHJS_COOKIE = "authjs.session-token";

const rand = () => randomBytes(8).toString("hex");

export type SeededUser = User & { sessionToken: string };

export async function seedUser(args?: {
  email?: string;
  name?: string | null;
}): Promise<SeededUser> {
  const prisma = getE2EPrisma();
  const user = await prisma.user.create({
    data: {
      email: args?.email ?? `${rand()}@e2e.local`,
      name: args?.name ?? `user-${rand().slice(0, 6)}`,
      emailVerified: new Date(),
    },
  });

  const sessionToken = `${rand()}${rand()}${rand()}${rand()}`;
  await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { ...user, sessionToken };
}

export async function loginAs(
  context: BrowserContext,
  user: SeededUser,
  baseURL: string,
): Promise<void> {
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: AUTHJS_COOKIE,
      value: user.sessionToken,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
  ]);
}

// 別ユーザでログインし直すときに使う。古いクッキーを消してから addCookies。
export async function logout(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}
