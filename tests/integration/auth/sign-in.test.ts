// _setup must run before @/lib/auth so that NextAuth(config) sees the test
// AUTH_SECRET when it freezes secret/trustHost at import time. vi.mock is
// hoisted above ALL imports by vitest, but the mock factory only runs lazily
// on first import of @/lib/mailer (pulled in transitively by @/lib/auth).
import "./_setup";

import { vi, beforeEach, describe, expect, it } from "vitest";

vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn(async () => {}),
}));

import { NextRequest } from "next/server";

import { handlers } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { getPrisma } from "@/tests/setup/db.per-test";
import {
  buildSignInRequest,
  hashAuthToken,
  mintCsrfPair,
} from "./_helpers";

beforeEach(() => {
  vi.mocked(sendMail).mockClear();
});

async function postSignIn(email: string): Promise<Response> {
  const { token, cookieValue } = mintCsrfPair();
  return handlers.POST(
    buildSignInRequest({ email, csrfToken: token, csrfCookieValue: cookieValue }),
  );
}

describe("POST /api/auth/signin/resend (F-AUTH-01 / F-AUTH-02)", () => {
  it("メール宛に magic link が飛び、VerificationToken は hash 化されて DB に積まれる", async () => {
    const prisma = getPrisma();
    const res = await postSignIn("alice@test.local");

    // signIn が成功すると Auth.js は verify-request 画面へ 302 する。
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("verify-request");

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sendMail).mock.calls[0][0];
    expect(call.to).toBe("alice@test.local");
    expect(call.kind).toBe("verification");
    expect(call.subject).toContain("Sign in to");

    // 本文に埋め込まれる callback URL から raw token を抜き出す。
    const linkMatch = call.text.match(
      /https?:\/\/[^\s]+\/api\/auth\/callback\/resend\?[^\s]+/,
    );
    expect(linkMatch).not.toBeNull();
    const url = new URL(linkMatch![0]);
    const rawToken = url.searchParams.get("token");
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get("email")).toBe("alice@test.local");

    // DB には raw ではなく sha256(raw + secret) が入る (Auth.js の仕様)。
    const stored = await prisma.verificationToken.findUnique({
      where: { token: hashAuthToken(rawToken!) },
    });
    expect(stored).not.toBeNull();
    expect(stored?.identifier).toBe("alice@test.local");
    expect(stored?.token).not.toBe(rawToken); // raw は決して保存されない
    expect(stored?.expires.getTime()).toBeGreaterThan(Date.now());
    // Resend provider の maxAge=24h を踏襲。25h を超えないことだけ緩く確認。
    const ttlMs = stored!.expires.getTime() - Date.now();
    expect(ttlMs).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it("既存ユーザの email でも token は新規発行される (Auth.js は新旧をここでは区別しない)", async () => {
    const prisma = getPrisma();
    await prisma.user.create({
      data: { email: "bob@test.local", emailVerified: new Date() },
    });

    const res = await postSignIn("bob@test.local");
    expect(res.status).toBe(302);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const tokens = await prisma.verificationToken.findMany();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].identifier).toBe("bob@test.local");
  });

  it("email は normalize される (大文字や前後空白を畳む)", async () => {
    const prisma = getPrisma();
    await postSignIn("  Carol@TEST.local  ");
    const tokens = await prisma.verificationToken.findMany();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].identifier).toBe("carol@test.local");
    expect(vi.mocked(sendMail).mock.calls[0][0].to).toBe("carol@test.local");
  });

  it("CSRF cookie が無いと sendMail も VerificationToken も発生しない", async () => {
    const prisma = getPrisma();
    const req = new NextRequest("http://localhost:3000/api/auth/signin/resend", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email: "no-csrf@test.local" }).toString(),
    });
    const res = await handlers.POST(req);

    // 失敗時は signin / error ページへ redirect される。verify-request には行かない。
    expect(res.headers.get("location") ?? "").not.toContain("verify-request");
    expect(sendMail).not.toHaveBeenCalled();
    expect(await prisma.verificationToken.count()).toBe(0);
  });
});
