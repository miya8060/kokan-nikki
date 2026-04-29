"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { SendNudgeError } from "@/app/_actions/errors";
import { auth } from "@/lib/auth";
import { NUDGE_RATE_LIMIT_MS } from "@/lib/nudges";
import { prisma } from "@/lib/prisma";
import { getNextTurnUserId } from "@/lib/turn";

// F-NUDGE-01〜03: 自分のターンでないメンバーが、現在のターンのメンバーに
// 「もう書いた？」ナッジを送る。受信者は notebookId からサーバー側で一意に
// 導出する (現ターン者 = ナッジ対象) ため、UI からは notebookId のみ受け取る。
// 同じ送信者から同じ受信者 (= per notebook) は 24h に 1 回まで (F-NUDGE-02)。
// 送信は Nudge レコードに残る (F-NUDGE-03)。

const sendNudgeInputSchema = z.object({
  notebookId: z.string().min(1),
});

type SendNudgeInput = z.infer<typeof sendNudgeInputSchema>;

export async function sendNudge(
  input: SendNudgeInput,
): Promise<{ nudgeId: string; toUserId: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new SendNudgeError("unauthenticated");
  }

  const parsed = sendNudgeInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SendNudgeError("invalid-input");
  }
  const { notebookId } = parsed.data;

  // NF-SEC-04: メンバーシップを必ずサーバー側で検証する。
  const member = await prisma.notebookMember.findUnique({
    where: { notebookId_userId: { notebookId, userId } },
    select: { userId: true },
  });
  if (!member) {
    throw new SendNudgeError("not-member");
  }

  // F-NUDGE-01: 現ターンの人が受信者。送信者が現ターンの人だと「自分が次に
  // 書く立場」なのでナッジを送る側ではない (= not-current-turn)。
  const toUserId = await getNextTurnUserId(notebookId);
  if (toUserId === null) {
    // 防御的: メンバーシップ確認を抜けた以上ここには来ないはず。
    throw new SendNudgeError("no-active-turn");
  }
  if (toUserId === userId) {
    throw new SendNudgeError("not-current-turn");
  }

  // F-NUDGE-02: 同 (notebook, from, to) ペアで 24h 以内のナッジがあれば拒否。
  // 直近 1 件と createdAt を比較するだけで十分 (DB ユニーク制約は MVP では不要)。
  const since = new Date(Date.now() - NUDGE_RATE_LIMIT_MS);
  const recent = await prisma.nudge.findFirst({
    where: {
      notebookId,
      fromUserId: userId,
      toUserId,
      createdAt: { gt: since },
    },
    select: { id: true },
  });
  if (recent) {
    throw new SendNudgeError("rate-limited");
  }

  // F-NUDGE-03: ナッジレコードを記録する。手動ナッジはここでは email を
  // 送らない (cron による自動通知は F-NUDGE-04 の別経路で実装する)。
  const nudge = await prisma.nudge.create({
    data: { notebookId, fromUserId: userId, toUserId },
    select: { id: true },
  });
  return { nudgeId: nudge.id, toUserId };
}

// Form-action shim. notebookId は描画時に bind するので hidden input 経由の
// 詐称は効かない。受信者はサーバー側で導出するため、ここでも引数に取らない。
export async function sendNudgeFromForm(notebookId: string): Promise<void> {
  await sendNudge({ notebookId });
  revalidatePath(`/notebooks/${notebookId}`);
}
