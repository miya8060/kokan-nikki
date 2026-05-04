import type { Prisma, PrismaClient } from "@prisma/client";

// F-AUTH-06 / issue #68
// 同じ実在ユーザーが複数の User row に分裂した場合の統合処理。
// X (Twitter) OAuth 2.0 が email を返さないため、X 経由の sign-in が email
// 既存ユーザーと自動 link できず別 User#B として作成されてしまう。本関数は
// User#B → User#A への統合を行い、Account / Entry / Nudge / NotebookMember を
// 移し替えた後 User#B を削除する。UI 経由でのみ呼び出される (自動 merge は
// しない方針 — 本 issue 「やらないこと」参照)。
//
// 不可逆操作なので UserMergeLog に永続記録を残し、CS 対応の「自分のデータが
// 消えた」問合せに後追いできるようにする。

export type MergeUsersResult =
  | { status: "ok"; summary: MergeSummary }
  | { status: "aborted"; reason: AbortReason; conflictingProviders?: string[] };

export type AbortReason =
  | "self-merge"
  | "missing-user"
  | "account-conflict";

export interface MergeSummary {
  fromUserId: string;
  toUserId: string;
  movedAccounts: number;
  deletedSessions: number;
  movedEntries: number;
  movedNudgesFrom: number;
  movedNudgesTo: number;
  movedMemberships: number;
  dedupedMemberships: number;
  emailTransferred: boolean;
  retargetedMergeLogs: number;
}

export async function mergeUsers(opts: {
  prisma: PrismaClient;
  fromUserId: string;
  toUserId: string;
}): Promise<MergeUsersResult> {
  const { prisma, fromUserId, toUserId } = opts;

  if (fromUserId === toUserId) {
    return { status: "aborted", reason: "self-merge" };
  }

  return prisma.$transaction(async (tx) => {
    const [fromUser, toUser] = await Promise.all([
      tx.user.findUnique({ where: { id: fromUserId } }),
      tx.user.findUnique({ where: { id: toUserId } }),
    ]);
    if (!fromUser || !toUser) {
      return { status: "aborted", reason: "missing-user" } as const;
    }

    // Account 競合: 同じ provider が両 user に link 済の場合は abort。
    // 「先に既存 X 連携を解除してから merge してね」と UI で案内する想定。
    const [fromAccounts, toAccounts] = await Promise.all([
      tx.account.findMany({
        where: { userId: fromUserId },
        select: { provider: true },
      }),
      tx.account.findMany({
        where: { userId: toUserId },
        select: { provider: true },
      }),
    ]);
    const toProviders = new Set(toAccounts.map((a) => a.provider));
    const conflictingProviders = Array.from(
      new Set(
        fromAccounts
          .map((a) => a.provider)
          .filter((p) => toProviders.has(p)),
      ),
    );
    if (conflictingProviders.length > 0) {
      return {
        status: "aborted",
        reason: "account-conflict",
        conflictingProviders,
      } as const;
    }

    // email transfer: To が email を持っておらず From が持っている場合のみ
    // 引き継ぐ (X 単独 user に email 経路を後付けする逆方向の merge を想定)。
    // User.email は @unique なので From を先に NULL に落としてから To に乗せる。
    let emailTransferred = false;
    if (!toUser.email && fromUser.email) {
      const movedEmail = fromUser.email;
      const movedVerified = fromUser.emailVerified;
      await tx.user.update({
        where: { id: fromUserId },
        data: { email: null, emailVerified: null },
      });
      await tx.user.update({
        where: { id: toUserId },
        data: {
          email: movedEmail,
          emailVerified: movedVerified ?? toUser.emailVerified,
        },
      });
      emailTransferred = true;
    }

    const accountUpdate = await tx.account.updateMany({
      where: { userId: fromUserId },
      data: { userId: toUserId },
    });

    const sessionDelete = await tx.session.deleteMany({
      where: { userId: fromUserId },
    });

    const entryUpdate = await tx.entry.updateMany({
      where: { authorId: fromUserId },
      data: { authorId: toUserId },
    });

    const nudgeFromUpdate = await tx.nudge.updateMany({
      where: { fromUserId },
      data: { fromUserId: toUserId },
    });
    const nudgeToUpdate = await tx.nudge.updateMany({
      where: { toUserId: fromUserId },
      data: { toUserId },
    });

    // NotebookMember は @@id([notebookId, userId]) なので、To が同 notebook の
    // member ならば From の row を delete (dedup)、そうでなければ userId を
    // 書き換えて転送する。orderIndex は @@unique([notebookId, orderIndex]) で
    // notebook 単位なので、To が未参加なら衝突しない。
    const fromMemberships = await tx.notebookMember.findMany({
      where: { userId: fromUserId },
      select: { notebookId: true },
    });
    const fromNotebookIds = fromMemberships.map((m) => m.notebookId);
    const toAlreadyIn = new Set(
      (
        await tx.notebookMember.findMany({
          where: { userId: toUserId, notebookId: { in: fromNotebookIds } },
          select: { notebookId: true },
        })
      ).map((m) => m.notebookId),
    );

    let movedMemberships = 0;
    let dedupedMemberships = 0;
    for (const m of fromMemberships) {
      if (toAlreadyIn.has(m.notebookId)) {
        await tx.notebookMember.delete({
          where: {
            notebookId_userId: {
              notebookId: m.notebookId,
              userId: fromUserId,
            },
          },
        });
        dedupedMemberships++;
      } else {
        await tx.notebookMember.update({
          where: {
            notebookId_userId: {
              notebookId: m.notebookId,
              userId: fromUserId,
            },
          },
          data: { userId: toUserId },
        });
        movedMemberships++;
      }
    }

    // 過去に From が「吸収先」だった merge log を To に付け替える。toUserId は
    // FK Cascade なので From を delete すると消えてしまうため、delete より前に
    // 退避する必要がある。
    const retargeted = await tx.userMergeLog.updateMany({
      where: { toUserId: fromUserId },
      data: { toUserId },
    });

    const summary: MergeSummary = {
      fromUserId,
      toUserId,
      movedAccounts: accountUpdate.count,
      deletedSessions: sessionDelete.count,
      movedEntries: entryUpdate.count,
      movedNudgesFrom: nudgeFromUpdate.count,
      movedNudgesTo: nudgeToUpdate.count,
      movedMemberships,
      dedupedMemberships,
      emailTransferred,
      retargetedMergeLogs: retargeted.count,
    };

    await tx.userMergeLog.create({
      data: {
        fromUserId,
        toUserId,
        summary: summary as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.user.delete({ where: { id: fromUserId } });

    return { status: "ok", summary } as const;
  });
}
