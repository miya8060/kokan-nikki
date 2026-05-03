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

// 一覧で 1 行に収めるための運用上の上限 30 文字。notebookNameSchema と同じく
// 改行は弾く（タイトル末尾改行で見た目が崩れるのを防ぐ）。
export const ENTRY_TITLE_MIN = 1;
export const ENTRY_TITLE_MAX = 30;

export const entryTitleSchema = z
  .string()
  .trim()
  .min(ENTRY_TITLE_MIN)
  .max(ENTRY_TITLE_MAX)
  .regex(/^[^\r\n]+$/, "改行は使えません");
