// 単一の email 送信抽象。
//
// - 本番 (RESEND_API_KEY が空でないとき): Resend HTTP API に直接 POST する。
//   resend SDK は依存に入っているが、Auth.js v5 の Resend provider と同じ
//   fetch ベースの呼び出しに揃え、SDK バージョン差分のリスクを取らない。
// - 開発 (RESEND_API_KEY が空のとき): tmp/dev-mailbox/ に JSON で書き出す。
//   /dev/inbox のページから内容を確認できる。
//
// 利用箇所:
// - lib/auth.ts の Resend provider override (F-AUTH の magic link)
// - F-NUDGE-04 の cron 通知 (今後)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type MailKind = "verification" | "nudge" | "other";

export type SendMailParams = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  /** /dev/inbox 上での分類用。dev 以外では使わない。 */
  kind?: MailKind;
};

export const DEV_MAILBOX_DIR = path.join(
  process.cwd(),
  "tmp",
  "dev-mailbox",
);

export async function sendMail(params: SendMailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await writeToDevMailbox(params);
    return;
  }
  await sendViaResend(params, apiKey);
}

async function sendViaResend(p: SendMailParams, apiKey: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: p.from,
      to: p.to,
      subject: p.subject,
      html: p.html ?? defaultHtml(p.text),
      text: p.text,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Resend error: ${res.status} ${await res.text().catch(() => "")}`,
    );
  }
}

async function writeToDevMailbox(p: SendMailParams) {
  await mkdir(DEV_MAILBOX_DIR, { recursive: true });
  const sentAt = new Date();
  const ts = sentAt.toISOString().replace(/[:.]/g, "-");
  const safeKind = p.kind ?? "other";
  const file = path.join(DEV_MAILBOX_DIR, `${ts}-${safeKind}.json`);
  const payload = {
    sentAt: sentAt.toISOString(),
    kind: safeKind,
    to: p.to,
    from: p.from,
    subject: p.subject,
    text: p.text,
    html: p.html ?? defaultHtml(p.text),
  };
  await writeFile(file, JSON.stringify(payload, null, 2), "utf8");
}

function defaultHtml(text: string): string {
  return `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
