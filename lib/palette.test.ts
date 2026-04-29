import { describe, expect, it } from "vitest";

import {
  DEFAULT_PALETTE,
  PALETTE_KEYS,
  parseCursorEnabled,
  parsePalette,
  serializeCursorEnabled,
} from "./palette";

// testing.md §4.1 — F-SET-01 / F-SET-02 / NF-A11Y-03 の純粋ヘルパ単体カバレッジ。
// cookies() は副作用ありなのでここでは触らず、文字列 → 値の写像だけを検証する。

describe("parsePalette (F-SET-01)", () => {
  it("returns the default palette when the cookie is unset", () => {
    expect(parsePalette(undefined)).toBe(DEFAULT_PALETTE);
  });

  it("returns the default palette when the cookie value is unknown", () => {
    expect(parsePalette("turquoise")).toBe(DEFAULT_PALETTE);
    expect(parsePalette("")).toBe(DEFAULT_PALETTE);
  });

  it.each(PALETTE_KEYS.map((k) => [k] as const))(
    "round-trips known palette key %s",
    (key) => {
      expect(parsePalette(key)).toBe(key);
    },
  );
});

describe("parseCursorEnabled (F-SET-02 / NF-A11Y-03)", () => {
  it("defaults to OFF when the cookie is unset (NF-A11Y-03)", () => {
    expect(parseCursorEnabled(undefined)).toBe(false);
  });

  it("only treats the literal 'on' as enabled", () => {
    expect(parseCursorEnabled("on")).toBe(true);
    expect(parseCursorEnabled("off")).toBe(false);
    expect(parseCursorEnabled("true")).toBe(false);
    expect(parseCursorEnabled("1")).toBe(false);
    expect(parseCursorEnabled("")).toBe(false);
  });

  it("serializes to the same wire format it parses", () => {
    expect(serializeCursorEnabled(true)).toBe("on");
    expect(serializeCursorEnabled(false)).toBe("off");
    expect(parseCursorEnabled(serializeCursorEnabled(true))).toBe(true);
    expect(parseCursorEnabled(serializeCursorEnabled(false))).toBe(false);
  });
});
