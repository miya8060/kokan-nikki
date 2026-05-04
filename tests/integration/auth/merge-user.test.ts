// _setup keeps AUTH_SECRET pinned for any code path that imports @/lib/auth
// transitively (the merge function itself doesn't, but we keep the convention
// for the auth/ folder).
import "./_setup";

import { describe, expect, it } from "vitest";

import { mergeUsers } from "@/lib/auth/merge-user";
import { getPrisma } from "@/tests/setup/db.per-test";
import {
  makeEntry,
  makeNotebook,
  makeNudge,
  makeSession,
  makeUser,
} from "@/tests/helpers/factories";

async function makeAccount(
  prisma: ReturnType<typeof getPrisma>,
  args: { userId: string; provider: string; providerAccountId: string },
) {
  return prisma.account.create({
    data: {
      userId: args.userId,
      type: "oauth",
      provider: args.provider,
      providerAccountId: args.providerAccountId,
    },
  });
}

describe("mergeUsers (issue #68 — User#B → User#A 統合)", () => {
  it("通常ケース: Account / Entry / Nudge / NotebookMember / Session を移し replicate を消す", async () => {
    const prisma = getPrisma();

    const userA = await makeUser(prisma, { email: "a@test.local" });
    const userB = await makeUser(prisma, { email: null, name: "x-user" });

    // userA: email + magic-link 由来、Google account 連携済
    await makeAccount(prisma, {
      userId: userA.id,
      provider: "google",
      providerAccountId: "google-1",
    });
    // userB: X 単独 user、別 notebook 持ちでデータが分裂している状態
    await makeAccount(prisma, {
      userId: userB.id,
      provider: "twitter",
      providerAccountId: "x-1",
    });

    const notebookA = await makeNotebook(prisma, { owner: userA });
    const notebookB = await makeNotebook(prisma, { owner: userB });

    await makeEntry(prisma, { notebook: notebookB, author: userB });
    await makeEntry(prisma, { notebook: notebookB, author: userB });
    await makeNudge(prisma, { notebook: notebookA, from: userA, to: userB });
    await makeNudge(prisma, { notebook: notebookB, from: userB, to: userA });
    await makeSession(prisma, { user: userB });

    const result = await mergeUsers({
      prisma,
      fromUserId: userB.id,
      toUserId: userA.id,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.summary.movedAccounts).toBe(1);
    expect(result.summary.deletedSessions).toBe(1);
    expect(result.summary.movedEntries).toBe(2);
    expect(result.summary.movedNudgesFrom).toBe(1);
    expect(result.summary.movedNudgesTo).toBe(1);
    expect(result.summary.movedMemberships).toBe(1);
    expect(result.summary.dedupedMemberships).toBe(0);
    // userA は email を保持済、userB の email は null だったので transfer なし。
    expect(result.summary.emailTransferred).toBe(false);

    // userB は完全削除
    expect(await prisma.user.findUnique({ where: { id: userB.id } })).toBeNull();
    // userA に X account が紐付いている
    const aAccounts = await prisma.account.findMany({
      where: { userId: userA.id },
      orderBy: { provider: "asc" },
    });
    expect(aAccounts.map((a) => a.provider)).toEqual(["google", "twitter"]);
    // notebookB の entry / membership が userA に付け替わっている
    const entries = await prisma.entry.findMany({
      where: { notebookId: notebookB.id },
    });
    expect(entries.every((e) => e.authorId === userA.id)).toBe(true);
    const members = await prisma.notebookMember.findMany({
      where: { notebookId: notebookB.id },
    });
    expect(members.map((m) => m.userId)).toEqual([userA.id]);
    // 監査ログが 1 件作成されている
    const log = await prisma.userMergeLog.findFirst({
      where: { fromUserId: userB.id, toUserId: userA.id },
    });
    expect(log).not.toBeNull();
  });

  it("Account 競合: 同一 provider が両 user に link 済なら abort し DB は変更しない", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: "a@test.local" });
    const userB = await makeUser(prisma, { email: null });

    await makeAccount(prisma, {
      userId: userA.id,
      provider: "twitter",
      providerAccountId: "x-A",
    });
    await makeAccount(prisma, {
      userId: userB.id,
      provider: "twitter",
      providerAccountId: "x-B",
    });

    const result = await mergeUsers({
      prisma,
      fromUserId: userB.id,
      toUserId: userA.id,
    });

    expect(result.status).toBe("aborted");
    if (result.status !== "aborted") return;
    expect(result.reason).toBe("account-conflict");
    expect(result.conflictingProviders).toEqual(["twitter"]);

    // 両 user とも生存し、Account も動いていない
    expect(await prisma.user.findUnique({ where: { id: userA.id } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: userB.id } })).not.toBeNull();
    expect(
      await prisma.account.count({ where: { userId: userA.id } }),
    ).toBe(1);
    expect(
      await prisma.account.count({ where: { userId: userB.id } }),
    ).toBe(1);
    expect(await prisma.userMergeLog.count()).toBe(0);
  });

  it("NotebookMember dedup: 共通 notebook では from の row が消え to が残る", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma);
    const userB = await makeUser(prisma);

    // 共通 notebook (両者 member)
    const shared = await makeNotebook(prisma, { owner: userA, members: [userB] });
    // userB 単独 notebook
    const onlyB = await makeNotebook(prisma, { owner: userB });

    const result = await mergeUsers({
      prisma,
      fromUserId: userB.id,
      toUserId: userA.id,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.summary.movedMemberships).toBe(1);
    expect(result.summary.dedupedMemberships).toBe(1);

    // shared notebook には userA だけが残る
    const sharedMembers = await prisma.notebookMember.findMany({
      where: { notebookId: shared.id },
    });
    expect(sharedMembers.map((m) => m.userId)).toEqual([userA.id]);
    // onlyB notebook には userA に付け替わった row だけがある
    const onlyBMembers = await prisma.notebookMember.findMany({
      where: { notebookId: onlyB.id },
    });
    expect(onlyBMembers.map((m) => m.userId)).toEqual([userA.id]);
  });

  it("email transfer: To が email を持たず From が持つ場合は引き継ぐ", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma, { email: null, name: "x-only" });
    const userB = await makeUser(prisma, { email: "b@test.local" });

    const result = await mergeUsers({
      prisma,
      fromUserId: userB.id,
      toUserId: userA.id,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.summary.emailTransferred).toBe(true);

    const survivor = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(survivor?.email).toBe("b@test.local");
  });

  it("self-merge は abort", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma);
    const result = await mergeUsers({
      prisma,
      fromUserId: userA.id,
      toUserId: userA.id,
    });
    expect(result.status).toBe("aborted");
    if (result.status !== "aborted") return;
    expect(result.reason).toBe("self-merge");
  });

  it("missing-user: 片方が存在しない場合は abort", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma);
    const result = await mergeUsers({
      prisma,
      fromUserId: "user_does_not_exist",
      toUserId: userA.id,
    });
    expect(result.status).toBe("aborted");
    if (result.status !== "aborted") return;
    expect(result.reason).toBe("missing-user");
  });

  it("過去の merge log: from が以前の to-survivor だった場合は付け替える", async () => {
    const prisma = getPrisma();
    const userA = await makeUser(prisma);
    const userB = await makeUser(prisma);

    // userB が以前「吸収先」だった merge log を捏造
    await prisma.userMergeLog.create({
      data: {
        fromUserId: "ancient-user",
        toUserId: userB.id,
        summary: { note: "synthetic prior merge" },
      },
    });

    const result = await mergeUsers({
      prisma,
      fromUserId: userB.id,
      toUserId: userA.id,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.summary.retargetedMergeLogs).toBe(1);

    // 旧 log は userA 宛に付け替わり、新 log と合わせて 2 件
    const logs = await prisma.userMergeLog.findMany({
      where: { toUserId: userA.id },
    });
    expect(logs).toHaveLength(2);
  });
});
