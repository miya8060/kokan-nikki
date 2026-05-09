// vi.mock("@/lib/auth") は tests/helpers/session.ts 側で hoisted される必要が
// あるため、Server Action を import する前にここを最初に書く (post-entry.test.ts
// と同じ理由)。
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { beforeEach, describe, expect, it, vi } from "vitest";

// next/cache の revalidatePath は test ランナーから呼ぶと
// "static generation store missing" で死ぬので、settings-actions.test.ts と
// 同じ流儀で vi.mock する (hoisted)。
const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { ToggleNotebookFavoriteError } from "@/app/_actions/errors";
import { toggleNotebookFavorite } from "@/app/_actions/notebook-favorite";
import { makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// issue #129: ♡ favorite Server Action のサーバー側挙動 (auth / membership /
// idempotent toggle) を DB 込みで確認する。一覧 UI のレンダリングは別レイヤ。

beforeEach(() => {
  clearMockSession();
  mocks.revalidatePath.mockClear();
});

describe("toggleNotebookFavorite (issue #129)", () => {
  it("最初の呼び出しで favorited=true、row が作られる", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(owner);

    const result = await toggleNotebookFavorite({ notebookId: notebook.id });
    expect(result).toEqual({ favorited: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/notebooks");

    const stored = await prisma.userNotebookFavorite.findUnique({
      where: {
        userId_notebookId: { userId: owner.id, notebookId: notebook.id },
      },
    });
    expect(stored).not.toBeNull();
  });

  it("2 回目の呼び出しで favorited=false、row が消える", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(owner);

    await toggleNotebookFavorite({ notebookId: notebook.id });
    const result = await toggleNotebookFavorite({ notebookId: notebook.id });
    expect(result).toEqual({ favorited: false });

    expect(
      await prisma.userNotebookFavorite.count({
        where: { userId: owner.id, notebookId: notebook.id },
      }),
    ).toBe(0);
  });

  it("未ログインは unauthenticated で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    // setMockSession しない。

    await expect(
      toggleNotebookFavorite({ notebookId: notebook.id }),
    ).rejects.toBeInstanceOf(ToggleNotebookFavoriteError);
    await expect(
      toggleNotebookFavorite({ notebookId: notebook.id }),
    ).rejects.toMatchObject({ reason: "unauthenticated" });
    expect(await prisma.userNotebookFavorite.count()).toBe(0);
  });

  it("non-member は not-member で拒否される (NF-SEC-04)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const stranger = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(stranger);

    await expect(
      toggleNotebookFavorite({ notebookId: notebook.id }),
    ).rejects.toMatchObject({
      name: "ToggleNotebookFavoriteError",
      reason: "not-member",
    });
    expect(await prisma.userNotebookFavorite.count()).toBe(0);
  });

  it("空 notebookId は invalid-input で拒否される", async () => {
    const owner = await makeUser(getPrisma());
    setMockSession(owner);

    await expect(
      toggleNotebookFavorite({ notebookId: "" }),
    ).rejects.toMatchObject({
      name: "ToggleNotebookFavoriteError",
      reason: "invalid-input",
    });
  });

  it("同じ notebook の favorite は user 単位で独立している", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });

    setMockSession(a);
    await toggleNotebookFavorite({ notebookId: notebook.id });
    setMockSession(b);
    await toggleNotebookFavorite({ notebookId: notebook.id });
    // a が外しても b の ON は残る。
    setMockSession(a);
    await toggleNotebookFavorite({ notebookId: notebook.id });

    const rows = await prisma.userNotebookFavorite.findMany({
      where: { notebookId: notebook.id },
    });
    expect(rows.map((r) => r.userId)).toEqual([b.id]);
  });
});
