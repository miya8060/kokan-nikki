// vi.mock("@/lib/auth") は session helper の import で発火する。auth() を触る
// action モジュールより先に読み込ませる必要があるため、最初の import に置く。
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { beforeEach, describe, expect, it } from "vitest";

import { CreateInviteError } from "@/app/_actions/errors";
import { createInvite } from "@/app/_actions/invites";
import { INVITE_CODE_PATTERN, INVITE_TTL_MS } from "@/lib/invites";
import { makeInvite, makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// testing.md §4.2 — F-INV-01 / F-INV-04 / NF-SEC-04 のサーバー側挙動を DB 込み
// で確認する。発行ページの描画は UI 層の責務なのでここでは扱わない。

beforeEach(() => {
  clearMockSession();
});

describe("createInvite (F-INV-01 / F-INV-04 / NF-SEC-04)", () => {
  it("メンバーが新規発行すると Invite 行が永続化され、有効期限は約 7 日後", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(owner);

    const before = Date.now();
    const result = await createInvite({ notebookId: notebook.id });
    const after = Date.now();

    expect(result.code).toMatch(INVITE_CODE_PATTERN);
    const stored = await prisma.invite.findUnique({
      where: { code: result.code },
    });
    expect(stored).not.toBeNull();
    expect(stored?.notebookId).toBe(notebook.id);
    expect(stored?.usedAt).toBeNull();
    // 7 日 ± 実行時間ぶんの揺らぎを許容する。
    const expMs = stored!.expiresAt.getTime();
    expect(expMs).toBeGreaterThanOrEqual(before + INVITE_TTL_MS);
    expect(expMs).toBeLessThanOrEqual(after + INVITE_TTL_MS);
  });

  it("F-INV-04: 有効な招待が既にあれば同じコードを再利用する", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, { notebook });
    setMockSession(owner);

    const result = await createInvite({ notebookId: notebook.id });

    expect(result.code).toBe(invite.code);
    // 新しい行は作られていない (依然として 1 件)。
    expect(await prisma.invite.count({ where: { notebookId: notebook.id } })).toBe(1);
  });

  it("既存の招待が期限切れなら新しいコードを発行する", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const expired = await makeInvite(prisma, {
      notebook,
      expiresAt: new Date(Date.now() - 60_000),
    });
    setMockSession(owner);

    const result = await createInvite({ notebookId: notebook.id });

    expect(result.code).not.toBe(expired.code);
    // 期限切れの古い行は残ったまま、新しい行が増える。
    expect(await prisma.invite.count({ where: { notebookId: notebook.id } })).toBe(2);
  });

  it("非メンバーは not-member で拒否され、Invite は作られない", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const stranger = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(stranger);

    await expect(
      createInvite({ notebookId: notebook.id }),
    ).rejects.toMatchObject({
      name: "CreateInviteError",
      reason: "not-member",
    });
    expect(await prisma.invite.count({ where: { notebookId: notebook.id } })).toBe(0);
  });

  it("未ログインは unauthenticated で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    // setMockSession を呼ばないので auth() は null。

    await expect(
      createInvite({ notebookId: notebook.id }),
    ).rejects.toBeInstanceOf(CreateInviteError);
    await expect(
      createInvite({ notebookId: notebook.id }),
    ).rejects.toMatchObject({ reason: "unauthenticated" });

    expect(await prisma.invite.count()).toBe(0);
  });

  it("invalid-input: 空 notebookId は弾かれる", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    setMockSession(owner);

    await expect(createInvite({ notebookId: "" })).rejects.toMatchObject({
      name: "CreateInviteError",
      reason: "invalid-input",
    });
    expect(await prisma.invite.count()).toBe(0);
  });
});
