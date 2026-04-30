// resolveDatabaseUrl と pickInternalCallbackUrl は本来 unit project 側で
// 網羅する純粋ヘルパだが、CI の cov-gate は integration project の coverage
// で走るため、lib/** branch threshold を満たすように integration 経由でも
// 全分岐を 1 度通す。ロジックの責務は対応する unit test と重複して良い。
import { describe, expect, it } from "vitest";

import { resolveDatabaseUrl } from "@/lib/db-url";
import {
  isInternalCallbackUrl,
  pickInternalCallbackUrl,
  unwrapCallbackUrl,
  wrapCallbackUrl,
} from "@/lib/safe-redirect";

describe("resolveDatabaseUrl (integration coverage hop)", () => {
  it("undefined → undefined", () => {
    expect(resolveDatabaseUrl(undefined)).toBeUndefined();
  });

  it("ローカル / direct URL は無加工で通す", () => {
    const url = "postgresql://kokan:kokan@localhost:5432/kokan";
    expect(resolveDatabaseUrl(url)).toBe(url);
  });

  it("Neon pooled URL (既存 query 有) には & で pgbouncer=true を追記", () => {
    const url =
      "postgresql://u:p@ep-x-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require";
    const out = resolveDatabaseUrl(url);
    expect(out).toBe(
      "postgresql://u:p@ep-x-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require&pgbouncer=true&connect_timeout=15",
    );
  });

  it("Neon pooled URL (query 無し) には ? で pgbouncer=true を追記", () => {
    const url = "postgresql://u:p@ep-x-pooler.ap-southeast-1.aws.neon.tech/db";
    const out = resolveDatabaseUrl(url);
    expect(out).toBe(
      "postgresql://u:p@ep-x-pooler.ap-southeast-1.aws.neon.tech/db?pgbouncer=true&connect_timeout=15",
    );
  });

  it("既に pgbouncer=true を含む pooled URL は二重付与しない", () => {
    const url =
      "postgresql://u:p@ep-x-pooler.aws.neon.tech/db?pgbouncer=true&sslmode=require";
    expect(resolveDatabaseUrl(url)).toBe(url);
  });
});

describe("safe-redirect (integration coverage hop)", () => {
  it("isInternalCallbackUrl の許可 / 拒否を 1 度ずつ踏む", () => {
    expect(isInternalCallbackUrl("/notebooks")).toBe(true);
    expect(isInternalCallbackUrl("//evil.example")).toBe(false);
    expect(isInternalCallbackUrl("/\\evil.example")).toBe(false);
    expect(isInternalCallbackUrl("https://evil.example")).toBe(false);
    expect(isInternalCallbackUrl("")).toBe(false);
    expect(isInternalCallbackUrl(undefined)).toBe(false);
  });

  it("pickInternalCallbackUrl の配列 / 単発 / fallback を 1 度ずつ踏む", () => {
    expect(pickInternalCallbackUrl(["/notebooks"], "/fallback")).toBe(
      "/notebooks",
    );
    expect(pickInternalCallbackUrl("/settings", "/fallback")).toBe("/settings");
    expect(pickInternalCallbackUrl("//evil", "/fallback")).toBe("/fallback");
    expect(pickInternalCallbackUrl(undefined, "/fallback")).toBe("/fallback");
  });

  it("wrapCallbackUrl は同一ホストの /auth/confirm に置換し to= に元 URL を base64url 埋め込み", () => {
    const original =
      "https://kokannikki.app/api/auth/callback/resend?token=abc123&email=alice@test.local";
    const wrapped = wrapCallbackUrl(original);
    const u = new URL(wrapped);
    expect(u.host).toBe("kokannikki.app");
    expect(u.pathname).toBe("/auth/confirm");
    expect(u.searchParams.get("to")).not.toBeNull();

    const back = unwrapCallbackUrl(u.searchParams.get("to"), "kokannikki.app");
    expect(back).not.toBeNull();
    const parsed = new URL(back!);
    expect(parsed.pathname).toBe("/api/auth/callback/resend");
    expect(parsed.searchParams.get("token")).toBe("abc123");
    expect(parsed.searchParams.get("email")).toBe("alice@test.local");
  });

  it("unwrapCallbackUrl は host 不一致 / コールバック以外 / 不正 base64 / 空入力を全て null", () => {
    const real =
      "https://kokannikki.app/api/auth/callback/resend?token=t&email=a@b";
    const realEncoded = new URL(wrapCallbackUrl(real)).searchParams.get("to")!;

    // 配列で渡された場合は先頭要素を採用
    expect(unwrapCallbackUrl([realEncoded], "kokannikki.app")).not.toBeNull();
    // host 不一致
    expect(unwrapCallbackUrl(realEncoded, "evil.example")).toBeNull();
    // コールバック以外のパスを wrap した URL は unwrap 拒否
    const notCallback = new URL(
      wrapCallbackUrl("https://kokannikki.app/notebooks"),
    ).searchParams.get("to")!;
    expect(unwrapCallbackUrl(notCallback, "kokannikki.app")).toBeNull();
    // base64 デコード後に URL として parse 不能 (new URL が throw)
    // → "abc" は base64 として有効だが、デコード結果 "i\xb7" は URL ではない
    expect(unwrapCallbackUrl("abc", "kokannikki.app")).toBeNull();
    // 空入力 / undefined
    expect(unwrapCallbackUrl("", "kokannikki.app")).toBeNull();
    expect(unwrapCallbackUrl(undefined, "kokannikki.app")).toBeNull();
  });
});
