import { z } from "zod";

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
