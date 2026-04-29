// vi.mock("@/lib/auth") は session helper の import で発火する。auth() を触る
// action モジュールより先に読み込ませる必要があるため、最初の import に置く。
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { beforeEach, describe, expect, it } from "vitest";

import { SendNudgeError } from "@/app/_actions/errors";
import { sendNudge } from "@/app/_actions/nudges";
import { NUDGE_RATE_LIMIT_MS } from "@/lib/nudges";
import {
  makeEntry,
  makeNotebook,
  makeNudge,
  makeUser,
} from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// testing.md §4.2 — F-NUDGE-01〜03 / NF-SEC-04 のサーバー側挙動を DB 込みで
// 確認する。受信者は notebookId からサーバー側で導出されるため、テストは
// 「現ターンが誰か」を entries の積み上げで操作して検証する。

beforeEach(() => {
  clearMockSession();
});

describe("sendNudge (F-NUDGE-01〜03 / NF-SEC-04)", () => {
  it("ターン外メンバーは現ターン者にナッジを送れて、Nudge 行が永続化される", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    // a が投稿済み → 現ターンは b。a (ターン外) から b へのナッジが正常系。
    await makeEntry(prisma, { notebook, author: a });

    setMockSession(a);
    const result = await sendNudge({ notebookId: notebook.id });

    expect(result.toUserId).toBe(b.id);
    expect(result.nudgeId).toEqual(expect.any(String));
    const stored = await prisma.nudge.findUnique({
      where: { id: result.nudgeId },
    });
    expect(stored).toMatchObject({
      notebookId: notebook.id,
      fromUserId: a.id,
      toUserId: b.id,
    });
  });

  it("自分が現ターンのときは not-current-turn で拒否される (F-NUDGE-01)", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    // 初回ターンは a。a 自身からのナッジは弾かれる。
    setMockSession(a);

    await expect(sendNudge({ notebookId: notebook.id })).rejects.toMatchObject({
      name: "SendNudgeError",
      reason: "not-current-turn",
    });
    expect(await prisma.nudge.count()).toBe(0);
  });

  it("非メンバーは not-member で拒否される (NF-SEC-04)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const stranger = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(stranger);

    await expect(sendNudge({ notebookId: notebook.id })).rejects.toMatchObject({
      name: "SendNudgeError",
      reason: "not-member",
    });
    expect(await prisma.nudge.count()).toBe(0);
  });

  it("未ログインは unauthenticated で拒否される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    // setMockSession を呼ばないので auth() は null を返す。

    await expect(
      sendNudge({ notebookId: notebook.id }),
    ).rejects.toBeInstanceOf(SendNudgeError);
    await expect(
      sendNudge({ notebookId: notebook.id }),
    ).rejects.toMatchObject({ reason: "unauthenticated" });
    expect(await prisma.nudge.count()).toBe(0);
  });

  it("invalid-input: 空 notebookId は弾かれる", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    setMockSession(owner);

    await expect(sendNudge({ notebookId: "" })).rejects.toMatchObject({
      name: "SendNudgeError",
      reason: "invalid-input",
    });
    expect(await prisma.nudge.count()).toBe(0);
  });

  it("F-NUDGE-02: 24h 以内に同じ from→to で送られていれば rate-limited で弾く", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    // 現ターンを b にするため a が投稿。
    await makeEntry(prisma, { notebook, author: a });
    // 23h 前のナッジが既にある状況。
    await makeNudge(prisma, {
      notebook,
      from: a,
      to: b,
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    });

    setMockSession(a);
    await expect(sendNudge({ notebookId: notebook.id })).rejects.toMatchObject({
      name: "SendNudgeError",
      reason: "rate-limited",
    });
    // 既存の 1 件のまま、新規は作られない。
    expect(await prisma.nudge.count({ where: { notebookId: notebook.id } })).toBe(1);
  });

  it("F-NUDGE-02: 24h を超えていれば再送できる", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    await makeEntry(prisma, { notebook, author: a });
    // 25h 前のナッジ → 24h 境界を越えているので再送可。
    await makeNudge(prisma, {
      notebook,
      from: a,
      to: b,
      createdAt: new Date(Date.now() - NUDGE_RATE_LIMIT_MS - 60 * 60 * 1000),
    });

    setMockSession(a);
    const result = await sendNudge({ notebookId: notebook.id });
    expect(result.toUserId).toBe(b.id);
    expect(await prisma.nudge.count({ where: { notebookId: notebook.id } })).toBe(2);
  });

  it("レートリミットは (notebook, from, to) スコープ: 別ノートのナッジでは弾かれない", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const nb1 = await makeNotebook(prisma, { owner: a, members: [b] });
    const nb2 = await makeNotebook(prisma, { owner: a, members: [b] });
    // それぞれ a 投稿済 → どちらも b ターン。
    await makeEntry(prisma, { notebook: nb1, author: a });
    await makeEntry(prisma, { notebook: nb2, author: a });
    // nb1 で 1h 前にナッジ済。nb2 はクリーン。
    await makeNudge(prisma, {
      notebook: nb1,
      from: a,
      to: b,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    setMockSession(a);
    // nb1 はレート超過で弾かれる。
    await expect(sendNudge({ notebookId: nb1.id })).rejects.toMatchObject({
      reason: "rate-limited",
    });
    // nb2 は別スコープなので通る。
    const result = await sendNudge({ notebookId: nb2.id });
    expect(result.toUserId).toBe(b.id);
  });
});
