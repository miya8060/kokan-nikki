import { afterEach, describe, expect, it, vi } from "vitest";

// F-LP-04: ルートランディングはログイン済みなら /notebooks へ redirect、未ログイン
// なら従来のランディングを描画する。auth() を mock するだけで成立するので unit
// プロジェクトに置く (DB 不要)。redirect() は throw する仕様 — write-page-guard
// と同じ digest 検査で確認する。

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

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

afterEach(() => {
  authMock.mockReset();
});

describe("Home (F-LP-04)", () => {
  it("ログイン済みなら /notebooks へ redirect する", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", email: "u1@example.com", name: null },
      expires: new Date(Date.now() + 60_000).toISOString(),
    });
    const { default: Home } = await import("./page");

    let caught: unknown;
    try {
      await Home();
    } catch (e) {
      caught = e;
    }

    expect(isRedirect(caught)).toBe(true);
    if (!isRedirect(caught)) return;
    expect(redirectUrlFrom(caught)).toBe("/notebooks");
  });

  it("未ログインなら redirect せずランディングを描画する", async () => {
    authMock.mockResolvedValue(null);
    const { default: Home } = await import("./page");

    const result = await Home();

    expect(result).toBeDefined();
  });
});
