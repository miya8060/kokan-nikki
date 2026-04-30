// F-USER-02: メンバーアイコンのプリセット定義。
// User.image (Auth.js v5 標準カラム / String?) に "preset:KEY" 形式で保存する。
// "preset:" prefix を独自に置くことで、将来 URL アップロード対応時に
// `https://…` と区別できる。Auth.js は image を読み書きしないので衝突しない。

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
