// vi.mock("@/lib/auth") は session helper の import で発火する。auth() を触る
// action モジュールより先に読み込ませる必要があるため、最初の import に置く。
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import type { User } from "@prisma/client";
import { beforeEach, describe, expect, it, type Mock } from "vitest";

import { AcceptInviteError } from "@/app/_actions/errors";
import { acceptInvite } from "@/app/_actions/invites";
import { auth } from "@/lib/auth";
import { generateInviteCode, NOTEBOOK_MAX_MEMBERS } from "@/lib/invites";
import { makeInvite, makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// next-auth の auth() は overload (handler ラッパー兼セッション取得) を持つため、
// vi.mocked(auth) 経由だと middleware 形の型が選ばれて mockResolvedValueOnce の
// 引数型が壊れる。テスト用途では mock fn として直に扱いたいので Mock にキャスト
// する。session helper 側の vi.fn(...) と同じ実体を指している。
const mockedAuth = auth as unknown as Mock;

// testing.md §4.2 / §6.1 — F-INV-02/03/05/06/07/08 と F-NB-02 / NF-CON-01 の
// サーバー側挙動を DB 込みで確認する。受諾ページの redirect は UI 層の責務
// なのでここでは扱わない。

// 並行受諾テストでは setMockSession が単一の current 値しか保持できないため、
// vi.mocked(auth).mockResolvedValueOnce で per-call の戻り値を queue する。
// helper 側を拡張する案も検討したが、tests/helpers/* は他トラックも触る共有
// インフラなので最小変更に留めた。
function sessionFor(user: User) {
  return {
    user: { id: user.id, email: user.email, name: user.name },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

beforeEach(() => {
  clearMockSession();
});

describe("acceptInvite happy path (F-INV-01 系)", () => {
  it("非メンバーが受諾するとメンバー化し Invite は usedAt が打たれる", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const joiner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, { notebook });
    setMockSession(joiner);

    const result = await acceptInvite({ code: invite.code });

    expect(result).toEqual({
      notebookId: notebook.id,
      alreadyMember: false,
    });

    const member = await prisma.notebookMember.findUnique({
      where: {
        notebookId_userId: { notebookId: notebook.id, userId: joiner.id },
      },
    });
    // 既存メンバーは owner のみ (orderIndex=0) なので、新メンバーは 1 になる。
    expect(member).toMatchObject({
      notebookId: notebook.id,
      userId: joiner.id,
      orderIndex: 1,
    });

    const used = await prisma.invite.findUnique({ where: { code: invite.code } });
    expect(used?.usedAt).toBeInstanceOf(Date);
  });

  it("UC-03: 3 人目は orderIndex=2 のメンバーとして加わる", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const second = await makeUser(prisma);
    const third = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner, members: [second] });
    const invite = await makeInvite(prisma, { notebook });
    setMockSession(third);

    await acceptInvite({ code: invite.code });

    const member = await prisma.notebookMember.findUnique({
      where: {
        notebookId_userId: { notebookId: notebook.id, userId: third.id },
      },
    });
    expect(member?.orderIndex).toBe(2);
  });
});

describe("acceptInvite negative paths (F-INV-02 / F-INV-03)", () => {
  it("F-INV-02: 期限切れの招待は expired で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const joiner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, {
      notebook,
      expiresAt: new Date(Date.now() - 60_000),
    });
    setMockSession(joiner);

    await expect(acceptInvite({ code: invite.code })).rejects.toMatchObject({
      name: "AcceptInviteError",
      reason: "expired",
    });

    expect(await prisma.notebookMember.count({ where: { notebookId: notebook.id } })).toBe(1);
    const after = await prisma.invite.findUnique({ where: { code: invite.code } });
    expect(after?.usedAt).toBeNull();
  });

  it("F-INV-03: 既に消費された招待は already-used で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const joiner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, { notebook });
    await prisma.invite.update({
      where: { code: invite.code },
      data: { usedAt: new Date(Date.now() - 1000) },
    });
    setMockSession(joiner);

    await expect(acceptInvite({ code: invite.code })).rejects.toMatchObject({
      name: "AcceptInviteError",
      reason: "already-used",
    });

    expect(await prisma.notebookMember.count({ where: { notebookId: notebook.id } })).toBe(1);
  });

  it("invalid-code: 存在しないコードは弾かれる", async () => {
    const prisma = getPrisma();
    const joiner = await makeUser(prisma);
    setMockSession(joiner);

    await expect(
      acceptInvite({ code: generateInviteCode() }),
    ).rejects.toMatchObject({
      name: "AcceptInviteError",
      reason: "invalid-code",
    });

    expect(await prisma.notebookMember.count()).toBe(0);
  });

  it("invalid-input: 形式が不正なコードは弾かれる", async () => {
    const prisma = getPrisma();
    const joiner = await makeUser(prisma);
    setMockSession(joiner);

    await expect(acceptInvite({ code: "short" })).rejects.toMatchObject({
      name: "AcceptInviteError",
      reason: "invalid-input",
    });
    await expect(acceptInvite({ code: "" })).rejects.toMatchObject({
      reason: "invalid-input",
    });
    expect(await prisma.notebookMember.count()).toBe(0);
  });

  it("未ログインは unauthenticated で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, { notebook });

    await expect(acceptInvite({ code: invite.code })).rejects.toBeInstanceOf(
      AcceptInviteError,
    );
    await expect(acceptInvite({ code: invite.code })).rejects.toMatchObject({
      reason: "unauthenticated",
    });

    const after = await prisma.invite.findUnique({ where: { code: invite.code } });
    expect(after?.usedAt).toBeNull();
  });
});

describe("acceptInvite idempotency (F-INV-06)", () => {
  it("既メンバーの再受諾は invite を消費せず idempotent 成功する", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const member = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner, members: [member] });
    const invite = await makeInvite(prisma, { notebook });
    setMockSession(member);

    const result = await acceptInvite({ code: invite.code });

    expect(result).toEqual({
      notebookId: notebook.id,
      alreadyMember: true,
    });

    // メンバー数も usedAt も増えていない。
    expect(await prisma.notebookMember.count({ where: { notebookId: notebook.id } })).toBe(2);
    const after = await prisma.invite.findUnique({ where: { code: invite.code } });
    expect(after?.usedAt).toBeNull();
  });
});

describe("acceptInvite hard limits (F-INV-07 / F-NB-02)", () => {
  it("メンバー数が上限 6 に達したノートの受諾は notebook-full で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const fillers: User[] = [];
    for (let i = 0; i < NOTEBOOK_MAX_MEMBERS - 1; i += 1) {
      fillers.push(await makeUser(prisma));
    }
    const seventh = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, {
      owner,
      members: fillers,
    });
    expect(
      await prisma.notebookMember.count({ where: { notebookId: notebook.id } }),
    ).toBe(NOTEBOOK_MAX_MEMBERS);
    const invite = await makeInvite(prisma, { notebook });
    setMockSession(seventh);

    await expect(acceptInvite({ code: invite.code })).rejects.toMatchObject({
      name: "AcceptInviteError",
      reason: "notebook-full",
    });

    // 7 人目は加わっていない。invite は claim 前に弾いているので消費もされない。
    expect(
      await prisma.notebookMember.count({ where: { notebookId: notebook.id } }),
    ).toBe(NOTEBOOK_MAX_MEMBERS);
    const after = await prisma.invite.findUnique({ where: { code: invite.code } });
    expect(after?.usedAt).toBeNull();
  });
});

describe("acceptInvite concurrency (F-INV-08 / NF-CON-01)", () => {
  it("同じ招待コードに 2 人が同時受諾しても、claim 成功は 1 人だけ", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, { notebook });

    // 並行 2 コールに別々の session を返すため per-call で queue する。
    mockedAuth
      .mockResolvedValueOnce(sessionFor(a))
      .mockResolvedValueOnce(sessionFor(b));

    const results = await Promise.allSettled([
      acceptInvite({ code: invite.code }),
      acceptInvite({ code: invite.code }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // 負けた側は AcceptInviteError("already-used")。
    const err = (rejected[0] as PromiseRejectedResult).reason;
    expect(err).toMatchObject({
      name: "AcceptInviteError",
      reason: "already-used",
    });

    // メンバーは owner + 勝者の 2 人だけ。
    const members = await prisma.notebookMember.findMany({
      where: { notebookId: notebook.id },
    });
    expect(members).toHaveLength(2);
    const winnerId = (
      fulfilled[0] as PromiseFulfilledResult<{
        notebookId: string;
        alreadyMember: boolean;
      }>
    ).value.notebookId;
    expect(winnerId).toBe(notebook.id);

    // invite は 1 度だけ消費されている。
    const used = await prisma.invite.findUnique({
      where: { code: invite.code },
    });
    expect(used?.usedAt).toBeInstanceOf(Date);
  });
});
