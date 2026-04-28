"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AcceptInviteError, CreateInviteError } from "@/app/_actions/errors";
import { auth } from "@/lib/auth";
import {
  INVITE_CODE_PATTERN,
  NOTEBOOK_MAX_MEMBERS,
  generateInviteCode,
  inviteExpiryFromNow,
} from "@/lib/invites";
import { prisma } from "@/lib/prisma";

// NOTEBOOK_MAX_MEMBERS は lib/invites.ts に置いている。Next 16 の "use server"
// 制約により、このファイルでは値定数を export できないため。

const createInviteInputSchema = z.object({
  notebookId: z.string().min(1),
});

type CreateInviteInput = z.infer<typeof createInviteInputSchema>;

export async function createInvite(
  input: CreateInviteInput,
): Promise<{ code: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new CreateInviteError("unauthenticated");
  }

  const parsed = createInviteInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new CreateInviteError("invalid-input");
  }
  const { notebookId } = parsed.data;

  // NF-SEC-04: メンバーシップをサーバー側で必ず検証する。
  const member = await prisma.notebookMember.findUnique({
    where: { notebookId_userId: { notebookId, userId } },
    select: { userId: true },
  });
  if (!member) {
    throw new CreateInviteError("not-member");
  }

  // F-INV-04: 同じノートで複数の有効な招待コードを同時に持たない。既存に
  // 有効なものがあれば再利用する (発行アクション = べき等)。
  const now = new Date();
  const existing = await prisma.invite.findFirst({
    where: {
      notebookId,
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { code: true },
  });
  if (existing) {
    return { code: existing.code };
  }

  const code = generateInviteCode();
  await prisma.invite.create({
    data: {
      notebookId,
      code,
      expiresAt: inviteExpiryFromNow(now),
    },
  });
  return { code };
}

// Form-action shim. notebookId は render 時に bind されるので hidden input に
// よる詐称を許さない (postEntryFromForm と同じ取り回し)。
export async function createInviteFromForm(notebookId: string): Promise<void> {
  await createInvite({ notebookId });
  revalidatePath(`/notebooks/${notebookId}/invite`);
}

const acceptInviteInputSchema = z.object({
  code: z.string().regex(INVITE_CODE_PATTERN),
});

type AcceptInviteInput = z.infer<typeof acceptInviteInputSchema>;

export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<{ notebookId: string; alreadyMember: boolean }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new AcceptInviteError("unauthenticated");
  }

  const parsed = acceptInviteInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AcceptInviteError("invalid-input");
  }
  const { code } = parsed.data;

  // まず招待を引く。ここで notebookId を確定させてから既メンバー判定 →
  // 失敗系の早期 reject → atomic claim、の順に流す。
  const invite = await prisma.invite.findUnique({
    where: { code },
    select: { notebookId: true, expiresAt: true, usedAt: true },
  });
  if (!invite) {
    throw new AcceptInviteError("invalid-code");
  }

  // F-INV-06: 既メンバーが踏んだ場合、招待コードを消費せずに idempotent
  // 成功とする。呼び出し側はこの notebookId に redirect すればよい。
  const existingMember = await prisma.notebookMember.findUnique({
    where: { notebookId_userId: { notebookId: invite.notebookId, userId } },
    select: { userId: true },
  });
  if (existingMember) {
    return { notebookId: invite.notebookId, alreadyMember: true };
  }

  // F-INV-02 / F-INV-03 の早期 reject。並行受諾の本当の安全性は下の
  // updateMany が担保するが、ここで弾けば UI 側で expired と already-used を
  // 別メッセージで出せる。
  const now = new Date();
  if (invite.usedAt !== null) {
    throw new AcceptInviteError("already-used");
  }
  if (invite.expiresAt.getTime() <= now.getTime()) {
    throw new AcceptInviteError("expired");
  }

  // F-INV-08 / NF-CON-01: claim とメンバー追加を 1 つの transaction に括る。
  // updateMany の WHERE で usedAt:null && expiresAt>now を atomic に検証して
  // いるので、2 人が同時に踏んでも片方しか count===1 を取れない。F-NB-02 の
  // 上限再評価も transaction の中で行い、満員ノートには member を作らない。
  const result = await prisma.$transaction(async (tx) => {
    const memberCount = await tx.notebookMember.count({
      where: { notebookId: invite.notebookId },
    });
    if (memberCount >= NOTEBOOK_MAX_MEMBERS) {
      throw new AcceptInviteError("notebook-full");
    }

    const claim = await tx.invite.updateMany({
      where: {
        code,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (claim.count === 0) {
      // 並行受諾レースで負けた / 直前で usedAt や expiresAt が変わった。
      // 利用者目線では「もう使えなくなった」なので already-used に寄せる。
      throw new AcceptInviteError("already-used");
    }

    // 末尾 orderIndex を取り、その +1 を新メンバーに割り当てる。F-INV-04 で
    // 有効コードは 1 本に限定されているため、claim 成功者が同 notebook で
    // 同時にこの分岐に立つことはなく、(notebookId, orderIndex) の unique
    // 制約に当たることはない。
    const last = await tx.notebookMember.findFirst({
      where: { notebookId: invite.notebookId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    const nextIndex = (last?.orderIndex ?? -1) + 1;

    await tx.notebookMember.create({
      data: {
        notebookId: invite.notebookId,
        userId,
        orderIndex: nextIndex,
      },
    });

    return { notebookId: invite.notebookId };
  });

  return { notebookId: result.notebookId, alreadyMember: false };
}

// Form-action shim for /invite/[code]. code は render 時に bind するため
// hidden input 経由の差し替えは効かない。受諾後はノート詳細に redirect する
// (UC-01 #6)。
export async function acceptInviteFromForm(code: string): Promise<void> {
  const result = await acceptInvite({ code });
  redirect(`/notebooks/${result.notebookId}`);
}
