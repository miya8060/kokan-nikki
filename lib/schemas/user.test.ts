import { describe, expect, it } from "vitest";

import { DISPLAY_NAME_MAX, displayNameSchema } from "./user";

// testing.md §4.1 — F-USER-01 の表示名バリデーションを zod 単体で確認。
// 32 文字上限と「空白のみ NG / 改行 NG」の境界値を押さえる。
describe("displayNameSchema (F-USER-01 境界値)", () => {
  it("空文字は拒否される", () => {
    expect(displayNameSchema.safeParse("").success).toBe(false);
  });

  it("空白のみは trim 後に空とみなして拒否される", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
  });

  it("1 文字は受理される（下限）", () => {
    expect(displayNameSchema.safeParse("あ").success).toBe(true);
  });

  it("32 文字は受理される（上限）", () => {
    expect(
      displayNameSchema.safeParse("a".repeat(DISPLAY_NAME_MAX)).success,
    ).toBe(true);
  });

  it("33 文字は拒否される（上限超過）", () => {
    expect(
      displayNameSchema.safeParse("a".repeat(DISPLAY_NAME_MAX + 1)).success,
    ).toBe(false);
  });

  it("前後の空白は trim される", () => {
    const parsed = displayNameSchema.safeParse("  あすか  ");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe("あすか");
    }
  });

  it("改行を含む値は拒否される", () => {
    expect(displayNameSchema.safeParse("foo\nbar").success).toBe(false);
    expect(displayNameSchema.safeParse("foo\r\nbar").success).toBe(false);
    expect(displayNameSchema.safeParse("foo\rbar").success).toBe(false);
  });
});
