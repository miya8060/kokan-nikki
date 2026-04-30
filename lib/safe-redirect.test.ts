import { describe, expect, it } from "vitest";

import {
  isInternalCallbackUrl,
  pickInternalCallbackUrl,
} from "./safe-redirect";

// NF-SEC (open redirect 防御): startsWith("/") だけでは protocol-relative URL
// を素通しするため、明示的に弾けることを境界値で押さえる。
describe("isInternalCallbackUrl", () => {
  it("internal absolute path は許可", () => {
    expect(isInternalCallbackUrl("/")).toBe(true);
    expect(isInternalCallbackUrl("/notebooks")).toBe(true);
    expect(isInternalCallbackUrl("/invite/abc-DEF_123")).toBe(true);
    expect(isInternalCallbackUrl("/notebooks/x?y=1")).toBe(true);
  });

  it("protocol-relative URL は拒否 (open redirect)", () => {
    expect(isInternalCallbackUrl("//evil.example")).toBe(false);
    expect(isInternalCallbackUrl("//evil.example/foo")).toBe(false);
  });

  it("backslash variant も拒否", () => {
    expect(isInternalCallbackUrl("/\\evil.example")).toBe(false);
    expect(isInternalCallbackUrl("/\\\\evil.example")).toBe(false);
  });

  it("schemed URL は拒否", () => {
    expect(isInternalCallbackUrl("http://evil.example")).toBe(false);
    expect(isInternalCallbackUrl("https://evil.example")).toBe(false);
    expect(isInternalCallbackUrl("javascript:alert(1)")).toBe(false);
    expect(isInternalCallbackUrl("data:text/html,<script>")).toBe(false);
  });

  it("空文字 / undefined / 非 string は拒否", () => {
    expect(isInternalCallbackUrl(undefined)).toBe(false);
    expect(isInternalCallbackUrl("")).toBe(false);
    expect(isInternalCallbackUrl(null)).toBe(false);
    expect(isInternalCallbackUrl(123)).toBe(false);
  });
});

describe("pickInternalCallbackUrl", () => {
  it("配列なら先頭を採用", () => {
    expect(pickInternalCallbackUrl(["/notebooks", "/x"], "/fallback")).toBe(
      "/notebooks",
    );
  });

  it("先頭が //evil なら fallback", () => {
    expect(pickInternalCallbackUrl(["//evil"], "/notebooks")).toBe(
      "/notebooks",
    );
  });

  it("undefined なら fallback", () => {
    expect(pickInternalCallbackUrl(undefined, "/notebooks")).toBe("/notebooks");
  });

  it("有効な値はそのまま返す", () => {
    expect(pickInternalCallbackUrl("/settings", "/notebooks")).toBe(
      "/settings",
    );
  });
});
