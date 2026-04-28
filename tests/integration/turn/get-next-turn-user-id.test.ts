import { describe, expect, it } from "vitest";
import { getNextTurnUserId, isUsersTurn } from "@/lib/turn";
import { makeEntry, makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// testing.md §6.3 — F-TURN ターン判定の DB 込み版。pickNextOrderIndex の純粋
// 計算は lib/turn.test.ts でカバー済みなので、ここでは Prisma クエリ
// (members の orderIndex 並び・最新 Entry の orderBy) が要件通りに動くこと
// と、NF-CON-02 タイブレーカーが SQL レイヤで効いていることを確認する。

describe("getNextTurnUserId (F-TURN-02 / F-TURN-03)", () => {
  it("returns null when the notebook has no members", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    // makeNotebook always seeds the owner as a member, so build a member-less
    // notebook directly to exercise the empty-members branch.
    const notebook = await prisma.notebook.create({
      data: { name: "empty", createdById: owner.id },
    });

    expect(await getNextTurnUserId(notebook.id)).toBeNull();
  });

  it("returns the first member when no entries exist (F-TURN-03)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const second = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner, members: [second] });

    expect(await getNextTurnUserId(notebook.id)).toBe(owner.id);
  });

  it("advances to the next member in cyclic order when latest author is mid-cycle (F-TURN-02)", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const c = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b, c] });
    await makeEntry(prisma, { notebook, author: a });

    expect(await getNextTurnUserId(notebook.id)).toBe(b.id);
  });

  it("wraps back to the first member when latest author is at the tail (F-TURN-02 wrap)", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const c = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b, c] });
    // Monotonically increasing createdAt so the latest entry by the
    // (createdAt DESC, id DESC) order is unambiguously c's.
    await makeEntry(prisma, {
      notebook,
      author: a,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await makeEntry(prisma, {
      notebook,
      author: b,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    await makeEntry(prisma, {
      notebook,
      author: c,
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
    });

    expect(await getNextTurnUserId(notebook.id)).toBe(a.id);
  });
});

describe("getNextTurnUserId (NF-CON-02 タイブレーカー)", () => {
  it("breaks createdAt ties by Entry.id DESC and stays deterministic across calls", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const c = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b, c] });

    // Two entries sharing the EXACT same createdAt. Without the secondary
    // `id DESC` order, Postgres is free to return either row first, which
    // would make the next-turn pick flap between b and c. The assertion
    // below would then become flaky — that flakiness is exactly what
    // NF-CON-02 is meant to prevent.
    const tie = new Date("2026-04-29T12:00:00.000Z");
    const e1 = await makeEntry(prisma, { notebook, author: a, createdAt: tie });
    const e2 = await makeEntry(prisma, { notebook, author: b, createdAt: tie });

    // Whichever entry has the lex-greater id wins under (createdAt DESC,
    // id DESC); the next turn is the member after that author in the cycle.
    const winnerAuthorId = e2.id > e1.id ? b.id : a.id;
    const expectedNext = winnerAuthorId === a.id ? b.id : c.id;

    // Repeat to surface any plan-flip / race nondeterminism.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => getNextTurnUserId(notebook.id)),
    );
    for (const result of results) {
      expect(result).toBe(expectedNext);
    }
  });
});

describe("isUsersTurn", () => {
  it("returns true only for the user whose turn comes next", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    await makeEntry(prisma, { notebook, author: a });

    expect(await isUsersTurn(notebook.id, b.id)).toBe(true);
    expect(await isUsersTurn(notebook.id, a.id)).toBe(false);
  });
});
