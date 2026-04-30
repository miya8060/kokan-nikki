import { describe, expect, it } from "vitest";
import { NOTEBOOK_NAME_MAX, notebookNameSchema } from "./notebook";

// testing.md §4.1 — F-NB-01 の名前バリデーションを zod 単体で確認。
// 上限は実装側で決めた 80 文字なので、その境界値も併せて押さえる。
describe("notebookNameSchema (F-NB-01 境界値)", () => {
  it("空文字は拒否される（名前必須）", () => {
    expect(notebookNameSchema.safeParse("").success).toBe(false);
  });

  it("空白のみは trim 後に空とみなして拒否される", () => {
    expect(notebookNameSchema.safeParse("   ").success).toBe(false);
  });

  it("1 文字は受理される（下限）", () => {
    expect(notebookNameSchema.safeParse("a").success).toBe(true);
  });

  it("80 文字は受理される（上限）", () => {
    expect(
      notebookNameSchema.safeParse("a".repeat(NOTEBOOK_NAME_MAX)).success,
    ).toBe(true);
  });

  it("81 文字は拒否される（上限超過）", () => {
    expect(
      notebookNameSchema.safeParse("a".repeat(NOTEBOOK_NAME_MAX + 1)).success,
    ).toBe(false);
  });

  it("前後の空白は trim される", () => {
    const parsed = notebookNameSchema.safeParse("  ひみつにっき  ");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe("ひみつにっき");
    }
  });

  // NF-SEC: 名前は cron のナッジメール subject に埋め込まれる経路がある。
  // 改行を許すと mail subject の表示崩れの温床になるため schema 側で弾く。
  it("改行を含む名前は拒否される", () => {
    expect(notebookNameSchema.safeParse("foo\nbar").success).toBe(false);
    expect(notebookNameSchema.safeParse("foo\r\nbar").success).toBe(false);
    expect(notebookNameSchema.safeParse("foo\rbar").success).toBe(false);
  });
});
