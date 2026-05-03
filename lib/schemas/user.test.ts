import { describe, expect, it } from "vitest";

import {
  DISPLAY_NAME_MAX,
  displayNameSchema,
  ICON_UPLOAD_MAX_BYTES,
  iconFormValueSchema,
  iconPresetSchema,
  iconUploadSchema,
} from "./user";

// testing.md §4.1 — F-USER-01 の表示名バリデーションを zod 単体で確認。
// 32 文字上限と「空白のみ NG / 改行 NG」の境界値を押さえる。
describe("displayNameSchema (F-USER-01 境界値)", () => {
  it("空文字は拒否される", () => {
    expect(displayNameSchema.safeParse("").success).toBe(false);
  });

  it("空白のみは trim 後に空とみなして拒否される", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
  });

  it("1 文字は受理される（下限）", () => {
    expect(displayNameSchema.safeParse("あ").success).toBe(true);
  });

  it("32 文字は受理される（上限）", () => {
    expect(
      displayNameSchema.safeParse("a".repeat(DISPLAY_NAME_MAX)).success,
    ).toBe(true);
  });

  it("33 文字は拒否される（上限超過）", () => {
    expect(
      displayNameSchema.safeParse("a".repeat(DISPLAY_NAME_MAX + 1)).success,
    ).toBe(false);
  });

  it("前後の空白は trim される", () => {
    const parsed = displayNameSchema.safeParse("  あすか  ");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe("あすか");
    }
  });

  it("改行を含む値は拒否される", () => {
    expect(displayNameSchema.safeParse("foo\nbar").success).toBe(false);
    expect(displayNameSchema.safeParse("foo\r\nbar").success).toBe(false);
    expect(displayNameSchema.safeParse("foo\rbar").success).toBe(false);
  });
});

// F-USER-02: アイコン (User.image) のフォーム値 schema。
// プリセット 4 種 + 「未設定 (= "")」を受け、それ以外は弾く。
describe("iconFormValueSchema (F-USER-02)", () => {
  it.each(["heart", "star", "plus", "dot"] as const)(
    "%s は受理される",
    (key) => {
      const parsed = iconFormValueSchema.safeParse(key);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toBe(key);
    },
  );

  it('"" (デフォルトに戻す) は受理される', () => {
    const parsed = iconFormValueSchema.safeParse("");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("");
  });

  it("未知のキーは拒否される", () => {
    expect(iconFormValueSchema.safeParse("rocket").success).toBe(false);
  });

  it("preset:heart のような直列化済み形式は拒否される (フォーム入力ではなく保存形式)", () => {
    expect(iconFormValueSchema.safeParse("preset:heart").success).toBe(false);
  });

  it("非文字列 (null / undefined) は拒否される", () => {
    expect(iconFormValueSchema.safeParse(null).success).toBe(false);
    expect(iconFormValueSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("iconPresetSchema (F-USER-02)", () => {
  it("空文字は拒否される (デフォルト戻しを表せるのは form schema 側のみ)", () => {
    expect(iconPresetSchema.safeParse("").success).toBe(false);
  });
});

// F-USER-03: アップロード入力 (client で 256x256 jpeg 化済みの File) の検証。
// Server Action 側で safeParse するため、size / mime / 空ファイルそれぞれの
// 失敗 message が後段の UpdateProfileError code にマップされる。
describe("iconUploadSchema (F-USER-03)", () => {
  function makeFile(size: number, type: string): File {
    const bytes = new Uint8Array(size);
    return new File([bytes], "icon.jpg", { type });
  }

  it.each(["image/jpeg", "image/png", "image/webp"] as const)(
    "%s で size 正常なら受理",
    (mime) => {
      const file = makeFile(1024, mime);
      const parsed = iconUploadSchema.safeParse({ file });
      expect(parsed.success).toBe(true);
    },
  );

  it("許可外 mime は invalid-type で失敗", () => {
    const file = makeFile(1024, "text/plain");
    const parsed = iconUploadSchema.safeParse({ file });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("invalid-type");
    }
  });

  it("size 超過は too-large で失敗", () => {
    const file = makeFile(ICON_UPLOAD_MAX_BYTES + 1, "image/jpeg");
    const parsed = iconUploadSchema.safeParse({ file });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("too-large");
    }
  });

  it("size 0 は empty で失敗", () => {
    const file = makeFile(0, "image/jpeg");
    const parsed = iconUploadSchema.safeParse({ file });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("empty");
    }
  });

  it("file が File でない (string) なら失敗", () => {
    expect(iconUploadSchema.safeParse({ file: "not-a-file" }).success).toBe(
      false,
    );
  });
});
