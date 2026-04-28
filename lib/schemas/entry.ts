import { z } from "zod";

// F-EDIT-02: 1 投稿は 1〜5,000 文字（空投稿不可）。
// F-EDIT-01: プレーンテキスト + 改行のみ — 文字種の制限はないため、ここでは
// 長さのみを検証する。Markdown を解釈しないのはレンダリング側の責務。
export const ENTRY_BODY_MIN = 1;
export const ENTRY_BODY_MAX = 5000;

export const entryBodySchema = z
  .string()
  .min(ENTRY_BODY_MIN)
  .max(ENTRY_BODY_MAX);
