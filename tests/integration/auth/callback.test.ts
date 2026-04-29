// _setup pins AUTH_SECRET before NextAuth(config) reads it; see sign-in.test.ts
// for the same hoist note.
import "./_setup";

import { vi, beforeEach, describe, expect, it } from "vitest";

vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn(async () => {}),
}));

import { handlers } from "@/lib/auth";
import { getPrisma } from "@/tests/setup/db.per-test";
import {
  buildCallbackRequest,
  findSessionCookie,
  freshRawToken,
  hashAuthToken,
} from "./_helpers";

beforeEach(() => {
  // mailer should not be touched by callback tests; clear just in case a
  // shared mock survives between cases.
  vi.clearAllMocks();
});

async function seedVerificationToken(args: {
  email: string;
  raw?: string;
  expires?: Date;
}): Promise<string> {
  const prisma = getPrisma();
  const raw = args.raw ?? freshRawToken();
  await prisma.verificationToken.create({
    data: {
      identifier: args.email,
      token: hashAuthToken(raw),
      expires: args.expires ?? new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return raw;
}

async function callback(email: string, raw: string): Promise<Response> {
  return handlers.GET(buildCallbackRequest({ email, rawToken: raw }));
}

describe("GET /api/auth/callback/resend (F-AUTH-03)", () => {
  it("正しい token を踏むと Session が作られ、VerificationToken は consume される", async () => {
    const prisma = getPrisma();
    const user = await prisma.user.create({
      data: { email: "carol@test.local", emailVerified: new Date() },
    });
    const raw = await seedVerificationToken({ email: "carol@test.local" });

    const res = await callback("carol@test.local", raw);
    expect(res.status).toBe(302);

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].expires.getTime()).toBeGreaterThan(Date.now());

    // Auth.js の useVerificationToken は delete で取り出すので 0 件になる。
    expect(await prisma.verificationToken.count()).toBe(0);

    // Set-Cookie に DB と同じ session token が乗っていること (cookie ↔ DB 整合)。
    const sessionCookie = findSessionCookie(res);
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain(sessions[0].sessionToken);
  });

  it("初回サインイン (User 未作成) でも User と Session が同時に生成される", async () => {
    const prisma = getPrisma();
    const raw = await seedVerificationToken({ email: "newbie@test.local" });

    const res = await callback("newbie@test.local", raw);
    expect(res.status).toBe(302);

    const user = await prisma.user.findUnique({
      where: { email: "newbie@test.local" },
    });
    expect(user).not.toBeNull();
    const sessions = await prisma.session.findMany({
      where: { userId: user!.id },
    });
    expect(sessions).toHaveLength(1);
    expect(findSessionCookie(res)).toBeDefined();
  });

  it("期限切れ token は reject、Session は作られない", async () => {
    const prisma = getPrisma();
    await prisma.user.create({ data: { email: "dave@test.local" } });
    const raw = await seedVerificationToken({
      email: "dave@test.local",
      expires: new Date(Date.now() - 60 * 1000),
    });

    const res = await callback("dave@test.local", raw);
    expect(res.status).toBe(302);
    // 失敗時は signin / error ページへ。session 用 cookie は付かない。
    expect(res.headers.get("location") ?? "").toMatch(
      /\/api\/auth\/(signin|error)/,
    );
    expect(findSessionCookie(res)).toBeUndefined();
    expect(await prisma.session.count()).toBe(0);
  });

  it("DB に存在しない token は reject、Session は作られない", async () => {
    const prisma = getPrisma();
    await prisma.user.create({ data: { email: "eve@test.local" } });
    const fakeRaw = freshRawToken();

    const res = await callback("eve@test.local", fakeRaw);
    expect(res.status).toBe(302);
    expect(res.headers.get("location") ?? "").toMatch(
      /\/api\/auth\/(signin|error)/,
    );
    expect(findSessionCookie(res)).toBeUndefined();
    expect(await prisma.session.count()).toBe(0);
  });

  it("一度使った token は再利用不可 (delete-then-check で 2 回目は no row)", async () => {
    const prisma = getPrisma();
    await prisma.user.create({ data: { email: "frank@test.local" } });
    const raw = await seedVerificationToken({ email: "frank@test.local" });

    const first = await callback("frank@test.local", raw);
    expect(first.status).toBe(302);
    expect(await prisma.session.count()).toBe(1);
    expect(findSessionCookie(first)).toBeDefined();

    const second = await callback("frank@test.local", raw);
    expect(second.status).toBe(302);
    expect(second.headers.get("location") ?? "").toMatch(
      /\/api\/auth\/(signin|error)/,
    );
    expect(findSessionCookie(second)).toBeUndefined();
    // Session は新たに増えない。
    expect(await prisma.session.count()).toBe(1);
  });

  it("identifier (email) と token の組が DB と一致しないと reject", async () => {
    const prisma = getPrisma();
    await prisma.user.create({ data: { email: "owner@test.local" } });
    const raw = await seedVerificationToken({ email: "owner@test.local" });

    // 違う email を URL に乗せて踏む。
    const res = await callback("attacker@test.local", raw);
    expect(res.status).toBe(302);
    expect(res.headers.get("location") ?? "").toMatch(
      /\/api\/auth\/(signin|error)/,
    );
    expect(findSessionCookie(res)).toBeUndefined();
    expect(await prisma.session.count()).toBe(0);

    // owner 側の token は (identifier, token) 複合キーで lookup を外したので
    // 残ったまま — このあと owner 本人が踏めば成立する。
    const remaining = await prisma.verificationToken.findMany();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].identifier).toBe("owner@test.local");
  });
});
