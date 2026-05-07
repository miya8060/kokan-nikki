import { describe, expect, it } from "vitest";

import {
  DEFAULT_PALETTE,
  PALETTE_KEYS,
  TWEAK_DEFAULTS,
  TWEAK_KEYS,
  parseCursorEnabled,
  parsePalette,
  parseTweak,
  serializeCursorEnabled,
  serializeTweak,
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

describe("parseTweak (#92)", () => {
  it.each(TWEAK_KEYS.map((key) => [key] as const))(
    "%s: undefined cookie falls back to handoff default",
    (key) => {
      expect(parseTweak(key, undefined)).toBe(TWEAK_DEFAULTS[key]);
    },
  );

  it.each(TWEAK_KEYS.map((key) => [key] as const))(
    "%s: unknown cookie value falls back to handoff default",
    (key) => {
      // 旧値 / typo / 攻撃ペイロードは黙って default に倒す。
      expect(parseTweak(key, "yes")).toBe(TWEAK_DEFAULTS[key]);
      expect(parseTweak(key, "")).toBe(TWEAK_DEFAULTS[key]);
      expect(parseTweak(key, "1")).toBe(TWEAK_DEFAULTS[key]);
    },
  );

  it.each(TWEAK_KEYS.map((key) => [key] as const))(
    "%s: 'on' / 'off' override the default in either direction",
    (key) => {
      expect(parseTweak(key, "on")).toBe(true);
      expect(parseTweak(key, "off")).toBe(false);
    },
  );

  it("handoff defaults: sparkle / tape / stickers が ON、pageFlip だけ OFF", () => {
    expect(TWEAK_DEFAULTS.sparkle).toBe(true);
    expect(TWEAK_DEFAULTS.tape).toBe(true);
    expect(TWEAK_DEFAULTS.stickers).toBe(true);
    expect(TWEAK_DEFAULTS.pageFlip).toBe(false);
  });

  it("serializeTweak round-trips through parseTweak", () => {
    for (const key of TWEAK_KEYS) {
      expect(parseTweak(key, serializeTweak(true))).toBe(true);
      expect(parseTweak(key, serializeTweak(false))).toBe(false);
    }
  });
});
