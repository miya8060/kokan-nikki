// notebook id ハッシュから cover palette / マステ / シール配置を決め打ちする。
// DB に色を持たせない方針 (引き継ぎ仕様) のため、id だけで決まる pure function に
// する。同じ notebook には常に同じ表紙が出る。

export const COVER_PALETTES = [
  { id: "pink", c1: "#ffb1d4", c2: "#ff6fa3", tape: "var(--tape-mint)", tapeR: "-8deg" },
  { id: "blue", c1: "#a8d6ff", c2: "#5fa8ff", tape: "var(--tape-pink)", tapeR: "6deg" },
  { id: "mint", c1: "#bff0d0", c2: "#6fdf95", tape: "var(--tape-yellow)", tapeR: "-5deg" },
  { id: "yellow", c1: "#ffe890", c2: "#ffc85a", tape: "var(--tape-blue)", tapeR: "9deg" },
  { id: "lilac", c1: "#d8c4ff", c2: "#a880ff", tape: "var(--tape-pink)", tapeR: "-10deg" },
  { id: "peach", c1: "#ffd1b3", c2: "#ff9a6f", tape: "var(--tape-mint)", tapeR: "4deg" },
] as const;

export type CoverPalette = (typeof COVER_PALETTES)[number];

export type StickerKind =
  | "star"
  | "heart"
  | "smile"
  | "ribbon"
  | "rainbow"
  | "flower"
  | "diamond"
  | "pixheart"
  | "cassette";

export type StickerSpec = {
  kind: StickerKind;
  x: string;
  y: string;
  size: number;
  color?: string;
  r: number;
};

// djb2 風の決定的ハッシュ。Web Crypto は同期 API がなく、ここでは碰突品質より
// 「同じ id で同じ結果」が満たせれば十分。
function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickCoverPalette(id: string): CoverPalette {
  return COVER_PALETTES[hashId(id) % COVER_PALETTES.length];
}

// マステの縞 / 通常も id ハッシュで決め打ち。
export function pickTapeStripe(id: string): boolean {
  return (hashId(id) >> 3) % 2 === 0;
}

// シール 3〜4 枚を id ハッシュから生成。位置は handoff の SEED に近い帯状。
const STICKER_PRESETS: ReadonlyArray<ReadonlyArray<StickerSpec>> = [
  [
    { kind: "heart", x: "68%", y: "38%", size: 38, color: "#fff", r: -12 },
    { kind: "star", x: "12%", y: "56%", size: 28, color: "#ffd400", r: 18 },
    { kind: "smile", x: "78%", y: "70%", size: 34, r: -8 },
    { kind: "diamond", x: "22%", y: "80%", size: 22, color: "#fff", r: 6 },
  ],
  [
    { kind: "rainbow", x: "60%", y: "30%", size: 46, r: -6 },
    { kind: "star", x: "18%", y: "44%", size: 26, color: "#ff6fa3", r: 12 },
    { kind: "ribbon", x: "72%", y: "72%", size: 38, r: -12 },
    { kind: "pixheart", x: "24%", y: "76%", size: 28, color: "#ff3aa9", r: 4 },
  ],
  [
    { kind: "flower", x: "66%", y: "32%", size: 38, color: "#ffb070", r: 10 },
    { kind: "smile", x: "16%", y: "68%", size: 32, r: -12 },
    { kind: "star", x: "82%", y: "62%", size: 22, color: "#fff", r: 6 },
  ],
  [
    { kind: "cassette", x: "60%", y: "30%", size: 50, r: -8 },
    { kind: "heart", x: "22%", y: "46%", size: 28, color: "#ff3aa9", r: 14 },
    { kind: "star", x: "82%", y: "68%", size: 24, color: "#ffd400", r: -6 },
  ],
  [
    { kind: "smile", x: "68%", y: "32%", size: 38, r: -10 },
    { kind: "heart", x: "18%", y: "58%", size: 28, color: "#fff", r: 12 },
    { kind: "flower", x: "78%", y: "72%", size: 30, color: "#ff6fa3", r: -4 },
  ],
  [
    { kind: "ribbon", x: "62%", y: "28%", size: 44, r: 8 },
    { kind: "rainbow", x: "16%", y: "60%", size: 42, r: -8 },
    { kind: "diamond", x: "80%", y: "70%", size: 22, color: "#fff", r: 10 },
  ],
];

export function pickStickers(id: string): ReadonlyArray<StickerSpec> {
  return STICKER_PRESETS[hashId(id) % STICKER_PRESETS.length];
}

// "2026/05/04 16:17" 風の formatter。Asia/Tokyo 固定。
export function formatJpDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// 24 時間以内に作られた notebook を NEW として扱う。
export function isFreshNotebook(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < 24 * 60 * 60 * 1000;
}

// memberships の partner 名から表示用ラベルを作る。
//   1 人      → "もも"
//   2 人以上  → "もも さんと他 N 人"
//   0 人      → null (= ひとりで)
export function formatPartnerLabel(names: ReadonlyArray<string>): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  return `${names[0]} さんと他 ${names.length - 1} 人`;
}

// entry body から 1 行プレビューを作る。改行手前または 30 文字でカット。
export function buildPreview(body: string | null | undefined): string | null {
  if (!body) return null;
  const trimmed = body.trim();
  if (trimmed.length === 0) return null;
  const firstLine = trimmed.split(/\r?\n/)[0] ?? "";
  if (firstLine.length <= 30) return firstLine;
  return firstLine.slice(0, 30) + "…";
}
