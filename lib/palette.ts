// F-SET-01 / F-SET-02 / NF-A11Y-03
// Cookie 値 ↔ パレット定数 / カーソル on/off の純関数マッピング。
// テスト容易性のため Next の cookies() には依存させず、文字列だけを受け取る。

export const PALETTE_KEYS = [
  "mint",
  "strawberry",
  "lavender",
  "cream",
] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];

export const DEFAULT_PALETTE: PaletteKey = "mint";

export const PALETTE_COOKIE = "kokan.palette";
export const CURSOR_COOKIE = "kokan.cursor";

// 1 年。Server Action から `(await cookies()).set` する際に使う。
export const SETTINGS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// 設計プロト app.jsx の 3 スロット (a/b/c) を踏襲。
// `mint` は default で、プロトでは PALETTES に未定義のため自前で命名。
export const PALETTE_LABELS: Record<
  PaletteKey,
  { name: string; a: string; b: string; c: string }
> = {
  mint: { name: "みんとぱふぇ", a: "#5cd6a8", b: "#ff8fbf", c: "#ffd56b" },
  strawberry: {
    name: "いちごミルク",
    a: "#ff8fbf",
    b: "#ffd56b",
    c: "#b59cff",
  },
  lavender: {
    name: "らべんだー夢",
    a: "#b59cff",
    b: "#9dead0",
    c: "#ffd6ec",
  },
  cream: { name: "くりーむそーだ", a: "#ffd56b", b: "#ffb1c8", c: "#a8d8ff" },
};

export function parsePalette(value: string | undefined): PaletteKey {
  return (PALETTE_KEYS as readonly string[]).includes(value ?? "")
    ? (value as PaletteKey)
    : DEFAULT_PALETTE;
}

// NF-A11Y-03: カスタムカーソルはデフォルト OFF。明示的に "on" のときだけ有効化する。
export function parseCursorEnabled(value: string | undefined): boolean {
  return value === "on";
}

export function serializeCursorEnabled(enabled: boolean): "on" | "off" {
  return enabled ? "on" : "off";
}
