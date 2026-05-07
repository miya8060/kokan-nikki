// vi.mock("@/lib/auth") must be hoisted before any module that imports auth().
// tests/helpers/session.ts performs the mock at module load time, so it has to
// be the FIRST import below — same caveat as post-entry.test.ts.
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { beforeEach, describe, expect, it } from "vitest";

import { CreateNotebookError } from "@/app/_actions/errors";
import { createNotebook } from "@/app/_actions/notebooks";
import { makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// testing.md §4.2 / §5 — F-NB-01 / F-NB-03 のサーバー側挙動を DB 込みで確認。
// 一覧画面 (F-NB-04) のレンダリングは UI 層の責務なのでここでは扱わない。

beforeEach(() => {
  clearMockSession();
});

describe("createNotebook (F-NB-01 / F-NB-03)", () => {
  it("作成者が orderIndex=0 のメンバーとして登録される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    setMockSession(owner);

    const result = await createNotebook({ name: "ひみつにっき", color: "pink" });

    expect(result.notebookId).toEqual(expect.any(String));

    const stored = await prisma.notebook.findUnique({
      where: { id: result.notebookId },
      include: { members: true },
    });
    expect(stored).toMatchObject({
      name: "ひみつにっき",
      createdById: owner.id,
    });
    expect(stored?.members).toHaveLength(1);
    expect(stored?.members[0]).toMatchObject({
      userId: owner.id,
      orderIndex: 0,
    });
  });

  it("名前は trim される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    setMockSession(owner);

    const result = await createNotebook({ name: "  わくわく  ", color: "pink" });
    const stored = await prisma.notebook.findUnique({
      where: { id: result.notebookId },
    });
    expect(stored?.name).toBe("わくわく");
  });

  it("未ログインは unauthenticated で拒否され、Notebook は作られない", async () => {
    const prisma = getPrisma();
    // setMockSession を呼ばないので auth() は null。

    await expect(
      createNotebook({ name: "anon", color: "pink" }),
    ).rejects.toBeInstanceOf(CreateNotebookError);
    await expect(
      createNotebook({ name: "anon", color: "pink" }),
    ).rejects.toMatchObject({
      reason: "unauthenticated",
    });

    expect(await prisma.notebook.count()).toBe(0);
  });

  it("空の名前は invalid-input で拒否され、Notebook は作られない", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    setMockSession(owner);

    await expect(
      createNotebook({ name: "   ", color: "pink" }),
    ).rejects.toMatchObject({
      name: "CreateNotebookError",
      reason: "invalid-input",
    });

    expect(await prisma.notebook.count()).toBe(0);
  });

  // issue #90: composer の swatch で選んだ色が DB に保存される。
  it("選んだ color が Notebook.color に保存される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    setMockSession(owner);

    const result = await createNotebook({ name: "lilac diary", color: "lilac" });
    const stored = await prisma.notebook.findUnique({
      where: { id: result.notebookId },
      select: { color: true },
    });
    expect(stored?.color).toBe("lilac");
  });

  it("未知の color は invalid-input で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    setMockSession(owner);

    await expect(
      // 6 色に無い値 (typo / 旧値) は zod 側で弾く。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createNotebook({ name: "x", color: "rainbow" as any }),
    ).rejects.toMatchObject({
      name: "CreateNotebookError",
      reason: "invalid-input",
    });
    expect(await prisma.notebook.count()).toBe(0);
  });
});
