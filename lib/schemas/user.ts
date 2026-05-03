import { z } from "zod";

import { ICON_PRESET_KEYS } from "@/lib/icons/presets";

// F-USER-01: 表示名 (User.name) は必須化される。notebook 名と同様に trim 後の
// 空白のみ入力は弾き、改行も拒否する。改行は将来 nudge メールの本文や差出人
// 表示に埋め込まれた際に表示崩れを起こす温床になるため schema 側で防ぐ。
export const DISPLAY_NAME_MIN = 1;
export const DISPLAY_NAME_MAX = 32;

export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN)
  .max(DISPLAY_NAME_MAX)
  .regex(/^[^\r\n]+$/, "改行は使えません");

// F-USER-02: アイコン (User.image) はプリセット選択 (MVP)。フォーム値として
// "" を「未設定 (デフォルトアイコンに戻す)」、"heart"|"star"|"plus"|"dot" を
// プリセットとして受ける。保存時に preset:KEY に直列化するのは Server Action
// 側の責務。
export const iconPresetSchema = z.enum(ICON_PRESET_KEYS);

export const iconFormValueSchema = z.union([z.literal(""), iconPresetSchema]);

// F-USER-03: アイコンの画像アップロード入力。client canvas で 256x256 jpeg に
// 正規化済みの File を受ける想定 (実測 ~30KB)。Server Actions のデフォルト上限
// 1MB に対する保険として MAX_BYTES を 1MB に置く。mime は client / Server 両方で
// チェック (信頼源は Server)。
export const ICON_UPLOAD_MAX_BYTES = 1024 * 1024;
export const ICON_UPLOAD_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const iconUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, "empty")
    .refine((f) => f.size <= ICON_UPLOAD_MAX_BYTES, "too-large")
    .refine(
      (f) => (ICON_UPLOAD_ALLOWED_MIME as readonly string[]).includes(f.type),
      "invalid-type",
    ),
});
