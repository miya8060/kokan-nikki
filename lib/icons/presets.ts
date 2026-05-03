// F-USER-02: メンバーアイコンのプリセット定義。
// User.image (Auth.js v5 標準カラム / String?) に "preset:KEY" 形式で保存する。
// "preset:" prefix を独自に置くことで、URL アップロード (`https://…`) と
// 区別できる。Auth.js は image を読み書きしないので衝突しない。

export const ICON_PRESET_KEYS = ["heart", "star", "plus", "dot"] as const;
export type IconPresetKey = (typeof ICON_PRESET_KEYS)[number];

export const ICON_PRESET_LABELS: Record<IconPresetKey, string> = {
  heart: "ハート",
  star: "ほし",
  plus: "ぷらす",
  dot: "まる",
};

const PRESET_PREFIX = "preset:";

export function serializePreset(key: IconPresetKey): string {
  return `${PRESET_PREFIX}${key}`;
}

export function parsePresetKey(image: string | null): IconPresetKey | null {
  if (!image || !image.startsWith(PRESET_PREFIX)) return null;
  const key = image.slice(PRESET_PREFIX.length);
  return (ICON_PRESET_KEYS as readonly string[]).includes(key)
    ? (key as IconPresetKey)
    : null;
}

export function isIconPresetKey(value: unknown): value is IconPresetKey {
  return (
    typeof value === "string" &&
    (ICON_PRESET_KEYS as readonly string[]).includes(value)
  );
}

// F-USER-03: User.image の生値を 3 種に分類する。UserAvatar の描画分岐と
// uploadIcon の旧 URL 削除判定 (URL モードのときだけ Vercel Blob から削除) で使う。
export type IconValue =
  | { kind: "preset"; key: IconPresetKey }
  | { kind: "url"; url: string }
  | { kind: "default" };

export function parseIconValue(image: string | null): IconValue {
  const presetKey = parsePresetKey(image);
  if (presetKey) return { kind: "preset", key: presetKey };
  if (image && image.startsWith("https://")) return { kind: "url", url: image };
  return { kind: "default" };
}

// アップロード済みの画像 URL かどうか。`del()` の対象判定に使う。
// 将来 backend を移しても URL ベースでの判定は変えなくて済むよう、
// ドメインまでは絞らず https:// で始まるかだけ見る。
export function isUploadedIconUrl(value: string | null): value is string {
  return value !== null && value.startsWith("https://");
}
