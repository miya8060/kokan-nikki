// F-AUTH-06 / issue #68 Stage 2
// /settings/link/* 配下の server action を統合テストする。
//
// 戦略:
//  - @/lib/auth の auth / signIn を vi.mock。auth は外部から差し替えられる
//    state を返し、signIn は spy
//  - @/lib/auth/link-intent の cookie I/O は next/headers に依存するので
//    丸ごと vi.mock。confirmLinkMerge の判定は readLinkIntent の戻り値で制御
//  - mergeUsers は実体を呼びたいので mock しない
//  - redirect() は NEXT_REDIRECT を throw するので、profile-actions と同じ
//    digest 解析で遷移先を取り出す

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@prisma/client";

type LinkIntent =
  | {
      v: 1;
      state: "started";
      toUserId: string;
      csrf: string;
      provider: "twitter";
      exp: number;
    }
  | {
      v: 1;
      state: "pending-confirm";
      toUserId: string;
      fromUserId: string;
      csrf: string;
      provider: "twitter";
      exp: number;
    };

const mocks = vi.hoisted(() => ({
  authState: { user: null as User | null },
  readLinkIntent: vi.fn<() => Promise<LinkIntent | null>>(),
  clearLinkIntent: vi.fn(async () => undefined),
  setLinkIntentStarted: vi.fn(async () => undefined),
  generateCsrfToken: vi.fn(() => "csrf-fixed-token-1234567890"),
  signIn: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => {
    const u = mocks.authState.user;
    if (!u) return null;
    return {
      user: { id: u.id, email: u.email, name: u.name },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }),
  signIn: mocks.signIn,
}));

vi.mock("@/lib/auth/link-intent", () => ({
  readLinkIntent: mocks.readLinkIntent,
  clearLinkIntent: mocks.clearLinkIntent,
  setLinkIntentStarted: mocks.setLinkIntentStarted,
  generateCsrfToken: mocks.generateCsrfToken,
}));

import {
  cancelLinkMerge,
  confirmLinkMerge,
  startLinkAccount,
} from "@/app/_actions/link-account";
import { makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

const REDIRECT_DIGEST_PREFIX = "NEXT_REDIRECT;";
function isRedirect(err: unknown): err is { digest: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith(REDIRECT_DIGEST_PREFIX)
  );
}
function redirectUrlFrom(err: { digest: string }): string {
  return err.digest.split(";").slice(2, -2).join(";");
}
async function captureRedirect(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (isRedirect(e)) return redirectUrlFrom(e);
    throw e;
  }
  throw new Error("expected redirect");
}

const VALID_CSRF = "csrf-token-aaaaaaaaaaaaaaaa";

beforeEach(() => {
  mocks.authState.user = null;
  mocks.readLinkIntent.mockReset();
  mocks.clearLinkIntent.mockClear();
  mocks.setLinkIntentStarted.mockClear();
  mocks.signIn.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("confirmLinkMerge (F-AUTH-06 Stage 2)", () => {
  it("正常系: cookie + csrf + session が揃い fromUserId に X account がある場合 mergeUsers が走る", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    const userB = await makeUser(prisma, { email: null, name: "x-user" });
    await prisma.account.create({
      data: {
        userId: userB.id,
        type: "oauth",
        provider: "twitter",
        providerAccountId: "x-acct-1",
      },
    });
    mocks.authState.user = userA;

    mocks.readLinkIntent.mockResolvedValue({
      v: 1,
      state: "pending-confirm",
      toUserId: userA.id,
      fromUserId: userB.id,
      csrf: VALID_CSRF,
      provider: "twitter",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const fd = new FormData();
    fd.set("csrf", VALID_CSRF);

    const target = await captureRedirect(confirmLinkMerge(fd));
    expect(target).toBe("/settings?link=merged");
    expect(mocks.clearLinkIntent).toHaveBeenCalledTimes(1);

    expect(await prisma.user.findUnique({ where: { id: userB.id } })).toBeNull();
    const movedAccount = await prisma.account.findFirst({
      where: { provider: "twitter", providerAccountId: "x-acct-1" },
      select: { userId: true },
    });
    expect(movedAccount?.userId).toBe(userA.id);
  });

  it("cookie が無いと expired に倒す", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    mocks.authState.user = userA;
    mocks.readLinkIntent.mockResolvedValue(null);

    const target = await captureRedirect(confirmLinkMerge(new FormData()));
    expect(target).toBe("/settings?link=expired");
    expect(mocks.clearLinkIntent).toHaveBeenCalled();
  });

  it("cookie が started のままだと expired に倒す", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    mocks.authState.user = userA;
    mocks.readLinkIntent.mockResolvedValue({
      v: 1,
      state: "started",
      toUserId: userA.id,
      csrf: VALID_CSRF,
      provider: "twitter",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const target = await captureRedirect(confirmLinkMerge(new FormData()));
    expect(target).toBe("/settings?link=expired");
  });

  it("CSRF token が一致しないと error に倒す", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    const userB = await makeUser(prisma, { email: null });
    mocks.authState.user = userA;
    mocks.readLinkIntent.mockResolvedValue({
      v: 1,
      state: "pending-confirm",
      toUserId: userA.id,
      fromUserId: userB.id,
      csrf: VALID_CSRF,
      provider: "twitter",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const fd = new FormData();
    fd.set("csrf", "wrong-csrf");

    const target = await captureRedirect(confirmLinkMerge(fd));
    expect(target).toBe("/settings?link=error");

    expect(await prisma.user.findUnique({ where: { id: userB.id } })).not.toBeNull();
  });

  it("session の userId が cookie の toUserId と一致しないと error に倒す", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    const userB = await makeUser(prisma, { email: null });
    const userC = await makeUser(prisma, { email: "c@test.local" });
    mocks.authState.user = userC;
    mocks.readLinkIntent.mockResolvedValue({
      v: 1,
      state: "pending-confirm",
      toUserId: userA.id,
      fromUserId: userB.id,
      csrf: VALID_CSRF,
      provider: "twitter",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const fd = new FormData();
    fd.set("csrf", VALID_CSRF);

    const target = await captureRedirect(confirmLinkMerge(fd));
    expect(target).toBe("/settings?link=error");

    expect(await prisma.user.findUnique({ where: { id: userB.id } })).not.toBeNull();
  });

  it("fromUserId に X account が無い (signIn callback 後に取り消された) と expired に倒す", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    const userB = await makeUser(prisma, { email: null });
    mocks.authState.user = userA;
    mocks.readLinkIntent.mockResolvedValue({
      v: 1,
      state: "pending-confirm",
      toUserId: userA.id,
      fromUserId: userB.id,
      csrf: VALID_CSRF,
      provider: "twitter",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const fd = new FormData();
    fd.set("csrf", VALID_CSRF);

    const target = await captureRedirect(confirmLinkMerge(fd));
    expect(target).toBe("/settings?link=expired");
  });

  it("merge が account-conflict で abort したら link=merge-account-conflict に倒す", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    const userB = await makeUser(prisma, { email: null });
    await prisma.account.create({
      data: {
        userId: userA.id,
        type: "oauth",
        provider: "google",
        providerAccountId: "g-1",
      },
    });
    await prisma.account.create({
      data: {
        userId: userB.id,
        type: "oauth",
        provider: "google",
        providerAccountId: "g-2",
      },
    });
    await prisma.account.create({
      data: {
        userId: userB.id,
        type: "oauth",
        provider: "twitter",
        providerAccountId: "x-1",
      },
    });
    mocks.authState.user = userA;
    mocks.readLinkIntent.mockResolvedValue({
      v: 1,
      state: "pending-confirm",
      toUserId: userA.id,
      fromUserId: userB.id,
      csrf: VALID_CSRF,
      provider: "twitter",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const fd = new FormData();
    fd.set("csrf", VALID_CSRF);

    const target = await captureRedirect(confirmLinkMerge(fd));
    expect(target).toBe("/settings?link=merge-account-conflict");

    expect(await prisma.user.findUnique({ where: { id: userA.id } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: userB.id } })).not.toBeNull();
  });
});

describe("cancelLinkMerge (F-AUTH-06 Stage 2)", () => {
  it("cookie をクリアして /settings?link=cancelled に飛ばす", async () => {
    const target = await captureRedirect(cancelLinkMerge());
    expect(target).toBe("/settings?link=cancelled");
    expect(mocks.clearLinkIntent).toHaveBeenCalledTimes(1);
  });
});

describe("startLinkAccount (F-AUTH-06 Stage 2)", () => {
  it("未ログインなら /auth/signin に飛ばす", async () => {
    mocks.authState.user = null;
    const fd = new FormData();
    fd.set("provider", "twitter");
    const target = await captureRedirect(startLinkAccount(fd));
    expect(target).toBe("/auth/signin?callbackUrl=/settings");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("既に X 連携済なら link=already に飛ばし signIn は呼ばない", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    await prisma.account.create({
      data: {
        userId: userA.id,
        type: "oauth",
        provider: "twitter",
        providerAccountId: "x-existing",
      },
    });
    mocks.authState.user = userA;

    const fd = new FormData();
    fd.set("provider", "twitter");
    const target = await captureRedirect(startLinkAccount(fd));
    expect(target).toBe("/settings?link=already");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("未対応 provider は throw", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    mocks.authState.user = userA;

    const fd = new FormData();
    fd.set("provider", "github");
    await expect(startLinkAccount(fd)).rejects.toThrow(/Unsupported/);
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("正常系: 未連携なら setLinkIntentStarted + signIn('twitter', ...) が呼ばれる", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    mocks.authState.user = userA;

    const fd = new FormData();
    fd.set("provider", "twitter");
    await startLinkAccount(fd);

    expect(mocks.setLinkIntentStarted).toHaveBeenCalledWith({
      toUserId: userA.id,
      csrf: "csrf-fixed-token-1234567890",
    });
    expect(mocks.signIn).toHaveBeenCalledWith("twitter", {
      redirectTo: "/settings/link/result",
    });
  });
});
