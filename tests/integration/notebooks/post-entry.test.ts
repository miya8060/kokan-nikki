// vi.mock("@/lib/auth") must be hoisted before any module that imports auth().
// tests/helpers/session.ts performs the mock at module load time, so it has to
// be the FIRST import below — otherwise app/_actions/notebooks.ts would pull
// the real auth() at import time and the setMockSession swap would have no
// effect.
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { beforeEach, describe, expect, it } from "vitest";

import { PostEntryError } from "@/app/_actions/errors";
import { postEntry } from "@/app/_actions/notebooks";
import { makeEntry, makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// testing.md §4.2 / §5 — F-TURN-05 と NF-SEC-04 のサーバー側ガードを
// DB 込みで確認する。e2e-03 (UI 直アクセスの redirect) は別レイヤなので
// ここでは postEntry の戻り値・例外と Entry テーブルの副作用だけを見る。

beforeEach(() => {
  clearMockSession();
});

describe("postEntry guard (F-TURN-05 / NF-SEC-04)", () => {
  it("自分のターンであればエントリが作成される", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    // a が初回投稿済み → 次のターンは b。
    await makeEntry(prisma, { notebook, author: a });

    setMockSession(b);
    const result = await postEntry({
      notebookId: notebook.id,
      title: "きょうの にっき",
      body: "hello",
    });

    expect(result.entryId).toEqual(expect.any(String));
    const stored = await prisma.entry.findUnique({
      where: { id: result.entryId },
    });
    expect(stored).toMatchObject({
      notebookId: notebook.id,
      authorId: b.id,
      title: "きょうの にっき",
      body: "hello",
    });
  });

  it("他人のターン中の postEntry は not-your-turn で拒否される (F-TURN-05)", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    // 初回ターンは a (orderIndex=0) なので、b の投稿は弾かれる。
    setMockSession(b);

    await expect(
      postEntry({
        notebookId: notebook.id,
        title: "out of turn",
        body: "out of turn",
      }),
    ).rejects.toMatchObject({
      name: "PostEntryError",
      reason: "not-your-turn",
    });

    // ガードが事前に効いていれば DB には何も入らないこと。
    const count = await prisma.entry.count({
      where: { notebookId: notebook.id },
    });
    expect(count).toBe(0);
  });

  it("非メンバーからの postEntry は not-member で拒否される (NF-SEC-04)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const stranger = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });

    setMockSession(stranger);

    await expect(
      postEntry({
        notebookId: notebook.id,
        title: "trespass",
        body: "trespass",
      }),
    ).rejects.toMatchObject({
      name: "PostEntryError",
      reason: "not-member",
    });

    const count = await prisma.entry.count({
      where: { notebookId: notebook.id },
    });
    expect(count).toBe(0);
  });

  it("未ログインの postEntry は unauthenticated で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    // setMockSession を呼ばないので auth() は null を返す。

    await expect(
      postEntry({
        notebookId: notebook.id,
        title: "anonymous",
        body: "anonymous",
      }),
    ).rejects.toBeInstanceOf(PostEntryError);
    await expect(
      postEntry({
        notebookId: notebook.id,
        title: "anonymous",
        body: "anonymous",
      }),
    ).rejects.toMatchObject({ reason: "unauthenticated" });

    const count = await prisma.entry.count({
      where: { notebookId: notebook.id },
    });
    expect(count).toBe(0);
  });

  it("title が空の postEntry は invalid-input で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(owner);

    await expect(
      postEntry({ notebookId: notebook.id, title: "", body: "ok" }),
    ).rejects.toMatchObject({
      name: "PostEntryError",
      reason: "invalid-input",
    });

    const count = await prisma.entry.count({
      where: { notebookId: notebook.id },
    });
    expect(count).toBe(0);
  });

  it("title が 31 文字の postEntry は invalid-input で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(owner);

    await expect(
      postEntry({
        notebookId: notebook.id,
        title: "a".repeat(31),
        body: "ok",
      }),
    ).rejects.toMatchObject({
      name: "PostEntryError",
      reason: "invalid-input",
    });

    const count = await prisma.entry.count({
      where: { notebookId: notebook.id },
    });
    expect(count).toBe(0);
  });

  it("title が改行を含む postEntry は invalid-input で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(owner);

    await expect(
      postEntry({
        notebookId: notebook.id,
        title: "hello\nworld",
        body: "ok",
      }),
    ).rejects.toMatchObject({
      name: "PostEntryError",
      reason: "invalid-input",
    });

    const count = await prisma.entry.count({
      where: { notebookId: notebook.id },
    });
    expect(count).toBe(0);
  });
});
