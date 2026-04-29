// F-NUDGE-04 + NF-SEC-02: 自動ナッジ通知の cron エンドポイント。
//
// - 認証: Authorization: Bearer ${CRON_SECRET} を SHA-256 ダイジェスト同士の
//   constant-time 比較で照合する。CRON_SECRET 未設定時は常に 401 (env 漏れで
//   実質 open になる事故を防ぐ)。
// - 動作: 全 notebook を走査し、最新 entry が NUDGE_THRESHOLD_HOURS (既定 72h)
//   より古ければ、現ターン者にメール通知する。最新 entry が無い (= まだ誰も
//   書いていない) 場合は基準時刻が無いのでスキップする。
// - 冪等性: 1 日 1 回というのは vercel.json の cron 頻度で担保する方針なので、
//   ここでは「同日に既に送ったか」のような状態を DB に持たない。連続実行されると
//   その分だけメールが飛ぶことを承知の上で、運用側 (vercel.json) を信頼する。

import { createHash, timingSafeEqual } from "node:crypto";

import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { getNextTurnUserId } from "@/lib/turn";

export const dynamic = "force-dynamic";

const DEFAULT_THRESHOLD_HOURS = 72;
const FROM_FALLBACK = "kokan-nikki <noreply@example.invalid>";

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const presented = header.slice(prefix.length);
  // SHA-256 で固定長に丸めてから比較すれば、長さ差・先頭一致による
  // タイミングリークを抑えられる (NF-SEC-02)。
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function thresholdMs(): number {
  const raw = process.env.NUDGE_THRESHOLD_HOURS;
  const n = raw ? Number(raw) : DEFAULT_THRESHOLD_HOURS;
  const hours = Number.isFinite(n) && n > 0 ? n : DEFAULT_THRESHOLD_HOURS;
  return hours * 60 * 60 * 1000;
}

function buildNudgeEmail(args: {
  toName: string;
  notebookName: string;
  notebookId: string;
}): { subject: string; text: string } {
  const base = process.env.AUTH_URL?.replace(/\/+$/, "") ?? "";
  const link = base
    ? `${base}/notebooks/${args.notebookId}`
    : `/notebooks/${args.notebookId}`;
  const subject = `「${args.notebookName}」のターンが まわってきたよ ♡`;
  const text = [
    `${args.toName} さんへ`,
    "",
    `「${args.notebookName}」が しばらく とまってるみたい。`,
    "そろそろ にっき、かいてみない？",
    "",
    link,
  ].join("\n");
  return { subject, text };
}

export async function GET(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - thresholdMs());
  const from = process.env.EMAIL_FROM ?? FROM_FALLBACK;

  // MVP 規模 (notebook 数が小さい) を前提に、最新 entry を notebook ごとに
  // take: 1 で引っ張る。groupBy + max(createdAt) よりも素直で、後で
  // notebook.name 等を一緒に取れるのが利点。
  const notebooks = await prisma.notebook.findMany({
    select: {
      id: true,
      name: true,
      entries: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const sent: { notebookId: string; toUserId: string }[] = [];
  const skipped: { notebookId: string; reason: string }[] = [];

  for (const nb of notebooks) {
    const latest = nb.entries[0];
    if (!latest) {
      skipped.push({ notebookId: nb.id, reason: "no-entries" });
      continue;
    }
    if (latest.createdAt > cutoff) {
      skipped.push({ notebookId: nb.id, reason: "fresh" });
      continue;
    }
    const toUserId = await getNextTurnUserId(nb.id);
    if (!toUserId) {
      skipped.push({ notebookId: nb.id, reason: "no-turn" });
      continue;
    }
    const toUser = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { email: true, name: true },
    });
    if (!toUser) {
      skipped.push({ notebookId: nb.id, reason: "no-user" });
      continue;
    }
    const { subject, text } = buildNudgeEmail({
      toName: toUser.name ?? toUser.email,
      notebookName: nb.name,
      notebookId: nb.id,
    });
    await sendMail({
      to: toUser.email,
      from,
      subject,
      text,
      kind: "nudge",
    });
    sent.push({ notebookId: nb.id, toUserId });
  }

  return Response.json({ ok: true, sent, skipped });
}
