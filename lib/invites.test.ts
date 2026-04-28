import { describe, expect, it } from "vitest";

import {
  INVITE_CODE_LENGTH,
  INVITE_CODE_PATTERN,
  INVITE_TTL_MS,
  generateInviteCode,
  inviteExpiryFromNow,
} from "./invites";

// testing.md §4.1 / §6.NF-SEC-05 — 招待コードは純粋関数なので単体に置く。
// 結合では「実際に DB に格納されてユニーク制約を踏まないか」までは扱わず、
// ここで形（長さ・charset）と分布のラフな衝突回避だけを assert する。

describe("generateInviteCode (NF-SEC-05)", () => {
  it("12 文字の URL-safe 文字列を返す", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(code).toMatch(INVITE_CODE_PATTERN);
  });

  it("1000 回呼んでも全て URL-safe な 12 字で、衝突しない", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      const code = generateInviteCode();
      expect(code).toMatch(INVITE_CODE_PATTERN);
      codes.add(code);
    }
    // 72 bit の空間に 1000 個 → 衝突確率は無視できる桁。落ちたら crypto 周りの
    // 退化を疑う合図にする。
    expect(codes.size).toBe(1000);
  });
});

describe("inviteExpiryFromNow (F-INV-02)", () => {
  it("base 時刻 + 7 日を返す", () => {
    const base = new Date("2026-04-29T00:00:00.000Z");
    const exp = inviteExpiryFromNow(base);
    expect(exp.getTime() - base.getTime()).toBe(INVITE_TTL_MS);
    expect(INVITE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
