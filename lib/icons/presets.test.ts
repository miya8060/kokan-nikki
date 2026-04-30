import { describe, expect, it } from "vitest";

import {
  ICON_PRESET_KEYS,
  isIconPresetKey,
  parsePresetKey,
  serializePreset,
} from "./presets";

// F-USER-02: User.image に "preset:KEY" 形式で保存する直列化/復元の往復と、
// 不正値が null に倒れることを押さえる。

describe("serializePreset / parsePresetKey", () => {
  it.each(ICON_PRESET_KEYS)("%s は往復する", (key) => {
    expect(parsePresetKey(serializePreset(key))).toBe(key);
  });

  it("null は null のまま (デフォルトアイコン)", () => {
    expect(parsePresetKey(null)).toBeNull();
  });

  it("preset: で始まらない文字列 (将来の URL アップロード等) は null", () => {
    expect(parsePresetKey("https://example.com/a.png")).toBeNull();
    expect(parsePresetKey("")).toBeNull();
  });

  it("preset: 接頭辞付きでも未知のキーは null", () => {
    expect(parsePresetKey("preset:rocket")).toBeNull();
  });
});

describe("isIconPresetKey", () => {
  it("プリセットキーだけ true", () => {
    expect(isIconPresetKey("heart")).toBe(true);
    expect(isIconPresetKey("rocket")).toBe(false);
    expect(isIconPresetKey(null)).toBe(false);
    expect(isIconPresetKey(123)).toBe(false);
  });
});
