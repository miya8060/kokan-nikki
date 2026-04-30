import { z } from "zod";

// F-NB-01: ノート作成時の名前は必須。要件では上限文字数を明示していないが、
// 一覧 UI で 1 行に収めるために運用上の上限として 80 文字を採用する。
// trim を噛ませて、空白のみの入力は「空」と同義として弾く。
export const NOTEBOOK_NAME_MIN = 1;
export const NOTEBOOK_NAME_MAX = 80;

// NF-SEC: notebook 名はナッジメールの subject に直接埋め込まれる
// (app/api/cron/nudge/route.ts:54)。改行を許すと一部 mail client で
// 表示崩れが起きるため、ここで弾いて DB に入る前に防ぐ。
export const notebookNameSchema = z
  .string()
  .trim()
  .min(NOTEBOOK_NAME_MIN)
  .max(NOTEBOOK_NAME_MAX)
  .regex(/^[^\r\n]+$/, "改行は使えません");
