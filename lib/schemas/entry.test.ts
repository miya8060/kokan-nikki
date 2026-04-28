import { describe, expect, it } from "vitest";
import { ENTRY_BODY_MAX, entryBodySchema } from "./entry";

// testing.md §4.1 — F-EDIT-02 の境界値を zod スキーマ単体で確認する。
// 文字種は F-EDIT-01 が「プレーンテキスト + 改行」を許すので、改行を含む
// 複数行入力も valid であることを併せて押さえておく。
describe("entryBodySchema (F-EDIT-02 境界値)", () => {
  it("空文字は拒否される（空投稿不可）", () => {
    expect(entryBodySchema.safeParse("").success).toBe(false);
  });

  it("1 文字は受理される（下限）", () => {
    expect(entryBodySchema.safeParse("a").success).toBe(true);
  });

  it("5,000 文字は受理される（上限）", () => {
    expect(entryBodySchema.safeParse("a".repeat(ENTRY_BODY_MAX)).success).toBe(
      true,
    );
  });

  it("5,001 文字は拒否される（上限超過）", () => {
    expect(
      entryBodySchema.safeParse("a".repeat(ENTRY_BODY_MAX + 1)).success,
    ).toBe(false);
  });

  it("改行を含む複数行入力は受理される（F-EDIT-01）", () => {
    expect(entryBodySchema.safeParse("一行目\n二行目\n").success).toBe(true);
  });
});
