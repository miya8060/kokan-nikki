import { describe, expect, it } from "vitest";

import {
  ICON_PRESET_KEYS,
  isIconPresetKey,
  isUploadedIconUrl,
  parseIconValue,
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

describe("parseIconValue", () => {
  it("null / 空文字は default", () => {
    expect(parseIconValue(null)).toEqual({ kind: "default" });
    expect(parseIconValue("")).toEqual({ kind: "default" });
  });

  it("preset:KEY は preset として解決", () => {
    expect(parseIconValue("preset:heart")).toEqual({
      kind: "preset",
      key: "heart",
    });
  });

  it("preset: で未知のキーは default に倒れる", () => {
    expect(parseIconValue("preset:unknown")).toEqual({ kind: "default" });
  });

  it("https:// で始まる文字列は url として扱う", () => {
    const url = "https://abc.public.blob.vercel-storage.com/x.jpg";
    expect(parseIconValue(url)).toEqual({ kind: "url", url });
  });

  it("scheme なし / 未知文字列は default", () => {
    expect(parseIconValue("random-string")).toEqual({ kind: "default" });
    expect(parseIconValue("http://insecure.example.com/x.jpg")).toEqual({
      kind: "default",
    });
  });
});

describe("isUploadedIconUrl", () => {
  it("https:// で始まる文字列だけ true", () => {
    expect(isUploadedIconUrl("https://example.com/x.jpg")).toBe(true);
    expect(isUploadedIconUrl(null)).toBe(false);
    expect(isUploadedIconUrl("preset:heart")).toBe(false);
    expect(isUploadedIconUrl("foo")).toBe(false);
    expect(isUploadedIconUrl("http://example.com/x.jpg")).toBe(false);
  });
});
