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

// /notebooks の Tweaks panel (#92)。design handoff にある 4 つの ON/OFF を
// cookie 永続化する。default は handoff デフォルト (sparkle / tape / stickers
// は ON、page-flip は OFF) に揃え、未設定 cookie の user も handoff 同等の
// 見た目になるようにする。
//
// data-* 属性で <html> に出すため、cookie 値も "on"|"off" の文字列で持つ
// (palette と同じく SSR 完結 / FOUC 無し)。
export const TWEAK_KEYS = ["sparkle", "tape", "stickers", "pageFlip"] as const;
export type TweakKey = (typeof TWEAK_KEYS)[number];

export const TWEAK_COOKIES: Record<TweakKey, string> = {
  sparkle: "kokan.sparkle",
  tape: "kokan.tape",
  stickers: "kokan.stickers",
  pageFlip: "kokan.page-flip",
};

export const TWEAK_DEFAULTS: Record<TweakKey, boolean> = {
  sparkle: true,
  tape: true,
  stickers: true,
  pageFlip: false,
};

export const TWEAK_LABELS: Record<TweakKey, { name: string; hint: string }> = {
  sparkle: {
    name: "✦ つくる ぱきぱき",
    hint: "「つくる」を おしたとき シールが はじけるよ",
  },
  tape: {
    name: "✿ マステ",
    hint: "ノートの 上に マスキングテープを はるよ",
  },
  stickers: {
    name: "♡ シール",
    hint: "表紙に シールを ぺたぺた はるよ",
  },
  pageFlip: {
    name: "★ 見開き ぺーじめくり",
    hint: "カードを おすと 見開きノートが 開いて めくれるよ",
  },
};

// SSR で <html data-...> に出す属性名。data-* は kebab-case にする。
export const TWEAK_DATA_ATTRS: Record<TweakKey, string> = {
  sparkle: "data-sparkle",
  tape: "data-tape",
  stickers: "data-stickers",
  pageFlip: "data-page-flip",
};

export function parseTweak(key: TweakKey, value: string | undefined): boolean {
  if (value === "on") return true;
  if (value === "off") return false;
  return TWEAK_DEFAULTS[key];
}

export function serializeTweak(enabled: boolean): "on" | "off" {
  return enabled ? "on" : "off";
}
